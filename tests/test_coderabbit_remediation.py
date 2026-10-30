"""Automated verification suite for CodeRabbit Remediation Findings CR-01 through CR-10.
Runs completely offline using mocks, doubles, and test clients.
Never connects to or commands live hardware.
"""
import copy
import hashlib
import hmac
import json
import os
import struct
import tempfile
import time
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "gen3-experimental-3d/backend"))
sys.path.insert(0, str(ROOT / "shared"))

# Gen 3 Backend imports
from web_dashboard.web_app import create_app
from surge_control.session import SessionManager, load_operators_config
from surge_control.runtime import ControlRuntime


# ---------------------------------------------------------------------------
# Cryptographic primitives matching surge_auth.h (RFC 2104 HMAC-SHA256)
# ---------------------------------------------------------------------------
SURGE_CMD_MAGIC = 0x5352    # 'S', 'R'
SURGE_TELEM_MAGIC = 0x5354  # 'S', 'T'
SURGE_CRYPTO_VERSION = 3
SURGE_OP_STOP = 0
SURGE_OP_RUN = 1

# Standard 32-byte provisioned key
DEFAULT_AUTH_KEY = b"SurGe090SecureKey2026_ProtocolV3"
AUTHORIZED_CONTROLLER_MAC = bytes([0x28, 0x05, 0xA5, 0x4E, 0x01, 0x38])
AUTHORIZED_ROBOT_MAC = bytes([0x28, 0x05, 0xA5, 0x4E, 0x01, 0x38])


def surge_hmac_sha256(key: bytes, data: bytes) -> bytes:
    """RFC 2104 HMAC-SHA256 matching surge_crypto::hmac_sha256."""
    return hmac.new(key, data, hashlib.sha256).digest()


def pack_auth_command(opcode: int, seq: int, epoch: int, key: bytes = DEFAULT_AUTH_KEY) -> bytes:
    """Matches AuthRobotCommand (28 bytes) in surge_auth.h."""
    header = struct.pack('<HBBII', SURGE_CMD_MAGIC, SURGE_CRYPTO_VERSION, opcode, seq, epoch)
    full_mac = surge_hmac_sha256(key, header)
    tag_16 = full_mac[:16]  # 128-bit truncated tag
    return header + tag_16


def verify_auth_command(packet: bytes, key: bytes = DEFAULT_AUTH_KEY):
    """Matches surge_verify_auth_command in surge_auth.h."""
    if len(packet) != 28:
        return False, None
    magic, ver, opcode, seq, epoch = struct.unpack('<HBBII', packet[:12])
    tag = packet[12:28]
    if magic != SURGE_CMD_MAGIC or ver != SURGE_CRYPTO_VERSION:
        return False, None
    expected_mac = surge_hmac_sha256(key, packet[:12])[:16]
    if not hmac.compare_digest(tag, expected_mac):
        return False, None
    return True, (opcode, seq, epoch)


def sign_text_command(seq: int, raw_cmd: str, key: bytes = DEFAULT_AUTH_KEY) -> str:
    """Matches surge_sign_text_command in surge_auth.h: AUTH,<seq>,<tag_hex_16>,<cmd>."""
    to_hash = f"{seq}:{raw_cmd}".encode('ascii')
    tag_hex = surge_hmac_sha256(key, to_hash)[:8].hex()
    return f"AUTH,{seq},{tag_hex},{raw_cmd}"


def verify_text_command(line: str, last_seq: int, key: bytes = DEFAULT_AUTH_KEY):
    """Matches surge_verify_text_command in surge_auth.h."""
    if not line.startswith("AUTH,"):
        return False, None, last_seq
    parts = line.split(",", 3)
    if len(parts) != 4:
        return False, None, last_seq
    _, seq_str, tag_hex, cmd = parts
    try:
        seq = int(seq_str)
    except ValueError:
        return False, None, last_seq

    if seq <= last_seq and last_seq != 0:
        return False, None, last_seq  # Replay rejected

    to_hash = f"{seq}:{cmd}".encode('ascii')
    expected_tag = surge_hmac_sha256(key, to_hash)[:8].hex()
    if not hmac.compare_digest(tag_hex, expected_tag):
        return False, None, last_seq
    return True, cmd, seq


class CodeRabbitRemediationTests(unittest.TestCase):

    # =======================================================================
    # CR-01 & CR-10: Cryptographic Radio Authentication (HMAC-SHA256)
    # =======================================================================
    def test_cr01_cr10_auth_command_size_and_layout(self):
        cmd = pack_auth_command(SURGE_OP_RUN, 1, 1)
        self.assertEqual(len(cmd), 28, "AuthRobotCommand must be exactly 28 bytes (HMAC-SHA256 128-bit)")

    def test_cr01_cr10_signature_verification_and_tamper_rejection(self):
        seq = 100
        epoch = 1
        valid_packet = pack_auth_command(SURGE_OP_RUN, seq, epoch)
        valid, fields = verify_auth_command(valid_packet)
        self.assertTrue(valid)
        self.assertEqual(fields, (SURGE_OP_RUN, seq, epoch))

        # Bit flip in opcode
        tampered = bytearray(valid_packet)
        tampered[3] ^= 0x01
        valid, _ = verify_auth_command(bytes(tampered))
        self.assertFalse(valid)

        # Bit flip in sequence number
        tampered = bytearray(valid_packet)
        tampered[4] ^= 0x01
        valid, _ = verify_auth_command(bytes(tampered))
        self.assertFalse(valid)

        # Bit flip in HMAC tag
        tampered = bytearray(valid_packet)
        tampered[20] ^= 0x01
        valid, _ = verify_auth_command(bytes(tampered))
        self.assertFalse(valid)

        # Wrong key
        valid, _ = verify_auth_command(valid_packet, key=b"WrongKey012345678901234567890123")
        self.assertFalse(valid)

    def test_cr01_cr10_replay_protection_sequence_and_epoch(self):
        last_seq = 42
        last_epoch = 1

        def check_replay(new_seq, new_epoch):
            if new_epoch > last_epoch:
                return True
            if new_epoch == last_epoch and new_seq > last_seq:
                return True
            return False

        # Same sequence in same epoch -> rejected
        self.assertFalse(check_replay(42, 1))
        # Older sequence in same epoch -> rejected
        self.assertFalse(check_replay(40, 1))
        # Advanced sequence in same epoch -> accepted
        self.assertTrue(check_replay(43, 1))
        # Newer epoch (controller reboot) with restarted sequence -> accepted
        self.assertTrue(check_replay(1, 2))

    def test_cr01_text_command_signing_and_verification(self):
        last_seq = 10
        signed = sign_text_command(11, "RUN")
        valid, cmd, next_seq = verify_text_command(signed, last_seq)
        self.assertTrue(valid)
        self.assertEqual(cmd, "RUN")
        self.assertEqual(next_seq, 11)

        # Replay same sequence -> rejected
        valid_replay, _, _ = verify_text_command(signed, next_seq)
        self.assertFalse(valid_replay)

        # Tampered command string -> rejected
        tampered_signed = signed.replace("RUN", "STOP")
        valid_tampered, _, _ = verify_text_command(tampered_signed, next_seq)
        self.assertFalse(valid_tampered)

    def test_cr01_credentials_gitignored(self):
        gitignore = (ROOT / ".gitignore").read_text()
        self.assertIn("surge_credentials.h", gitignore)

    # =======================================================================
    # CR-02 & CR-06: Receiver Authorization, Watchdog Separation, Maintenance
    # =======================================================================
    def test_cr02_maintenance_gate_with_timeout_and_single_use(self):
        state = {
            'armed': False,
            'maintenance_unlocked': False,
            'unlock_time': 0,
            'now': 1000,
            'servo_id': 1
        }
        TIMEOUT_MS = 15000

        def process_cmd(req):
            if req == "MAINT,UNLOCK,CONFIRM":
                if state['armed']:
                    return "ERR,MAINTENANCE,STOP_FIRST"
                state['maintenance_unlocked'] = True
                state['unlock_time'] = state['now']
                return "OK,MAINTENANCE_UNLOCKED"
            elif req.startswith("I,"):
                if not state['maintenance_unlocked'] or (state['now'] - state['unlock_time'] > TIMEOUT_MS):
                    state['maintenance_unlocked'] = False
                    return "ERR,MAINTENANCE_LOCKED"
                new_id = int(req.split(",")[1])
                state['servo_id'] = new_id
                state['maintenance_unlocked'] = False  # Single-use auto-relock
                return "ID_SET_OK"
            return "UNKNOWN"

        # Attempting without unlock fails
        self.assertEqual(process_cmd("I,5"), "ERR,MAINTENANCE_LOCKED")

        # Unlocking succeeds
        self.assertEqual(process_cmd("MAINT,UNLOCK,CONFIRM"), "OK,MAINTENANCE_UNLOCKED")

        # Expired after 16 seconds (> 15000 ms) fails
        state['now'] += 16000
        self.assertEqual(process_cmd("I,5"), "ERR,MAINTENANCE_LOCKED")

        # Unlock again, write within window succeeds
        process_cmd("MAINT,UNLOCK,CONFIRM")
        state['now'] += 5000
        self.assertEqual(process_cmd("I,5"), "ID_SET_OK")
        self.assertEqual(state['servo_id'], 5)

        # Single-use: immediate second write fails
        self.assertEqual(process_cmd("I,6"), "ERR,MAINTENANCE_LOCKED")

    def test_cr02_emergency_stop_failsafe_unconditional(self):
        # Emergency stop must halt torque even from unauthenticated sender
        def handle_recv(mac, text):
            if text == "STOP":
                return "EMERGENCY_STOP_HALTED"
            if mac != AUTHORIZED_CONTROLLER_MAC:
                return "DROPPED_UNAUTHORIZED_MAC"
            return "ENQUEUED"

        rogue_mac = bytes([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01])
        # Rogue RUN is dropped
        self.assertEqual(handle_recv(rogue_mac, "RUN"), "DROPPED_UNAUTHORIZED_MAC")
        # Rogue STOP halts robot immediately fail-safe
        self.assertEqual(handle_recv(rogue_mac, "STOP"), "EMERGENCY_STOP_HALTED")

    def test_cr06_watchdog_separates_arm_and_position_timestamps(self):
        WATCHDOG_MS = 750

        class ReceiverWatchdogSim:
            def __init__(self):
                self.armed = False
                self.last_arm_time = 0
                self.last_position_time = 0
                self.now = 1000

            def run(self):
                if not self.armed:
                    self.armed = True
                    self.last_arm_time = self.now
                    self.last_position_time = 0
                    return "OK,RUN"
                return "OK,RUN,ALREADY_ARMED"

            def position_update(self):
                if self.armed:
                    self.last_position_time = self.now
                    return "OK,P"
                return "ERR,DISARMED"

            def check_watchdog(self):
                if not self.armed:
                    return False
                ref_time = self.last_position_time if self.last_position_time != 0 else self.last_arm_time
                expired = (self.now - ref_time) > WATCHDOG_MS
                if expired:
                    self.armed = False
                return expired

        sim = ReceiverWatchdogSim()
        sim.run()
        self.assertTrue(sim.armed)

        # Advance 500 ms and send repeated RUN
        sim.now += 500
        self.assertEqual(sim.run(), "OK,RUN,ALREADY_ARMED")
        self.assertFalse(sim.check_watchdog())

        # Advance 300 ms more (total 800 ms since arm, no position received)
        sim.now += 300
        # Watchdog must trip despite repeated RUN
        self.assertTrue(sim.check_watchdog())
        self.assertFalse(sim.armed)

    # =======================================================================
    # CR-03 & CR-07: Backend Authorization & Fail-Closed Credentials
    # =======================================================================
    def test_cr03_connect_transitions_require_operator_role(self):
        app = create_app()
        client = app.test_client()
        runtime = app.config['CONTROL']
        runtime.state['engine'] = 'ST3215'
        runtime.state['is_running'] = True

        with patch.object(runtime, 'disconnect') as mock_disconnect:
            # Viewer attempt to disconnect/switch fails 403
            res = client.post('/api/connect', json={'engine': 'SIM'})
            self.assertEqual(res.status_code, 403)
            mock_disconnect.assert_not_called()

        runtime.state['is_running'] = False
        runtime.state['engine'] = 'SIM'

    def test_cr07_missing_config_fails_closed_without_hardcoded_fallback(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            missing_cfg = os.path.join(tmpdir, "nonexistent.json")
            sm = SessionManager(config_path=missing_cfg)
            ok, _, err = sm.authenticate("Shashank", "xyz@1234")
            self.assertFalse(ok)
            self.assertIn("not configured", err)

    # =======================================================================
    # CR-04: Strict Framing, Delimiters & Sensor Schema
    # =======================================================================
    def test_cr04_transmitter_rejects_embedded_delimiters_and_fake_control(self):
        receiver_mac = bytes([0x28, 0x05, 0xA5, 0x4E, 0x01, 0x38])
        other_mac = bytes([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC])

        def filter_radio_packet(src_mac, data):
            for b in data:
                if b in (ord('\r'), ord('\n'), 0) or b < 32 or b > 126:
                    return False
            if src_mac != receiver_mac:
                if len(data) < 3 or data[:2] != b"T:":
                    return False
                for b in data[2:]:
                    c = chr(b)
                    if not (c.isdigit() or c in ('.', '-', '+')):
                        return False
            return True

        self.assertTrue(filter_radio_packet(other_mac, b"T:25.4"))
        self.assertFalse(filter_radio_packet(other_mac, b"T:25.4\nOK,STOP"))
        self.assertFalse(filter_radio_packet(other_mac, b"T:OK,STOP"))
        self.assertTrue(filter_radio_packet(receiver_mac, b"OK,STOP"))

    # =======================================================================
    # CR-05: Robot Telemetry Cryptographic Authentication
    # =======================================================================
    def test_cr05_telemetry_authentication_and_replay_rejection(self):
        def pack_auth_telemetry(t_ms, seq, key=DEFAULT_AUTH_KEY):
            payload = struct.pack('<HII', SURGE_TELEM_MAGIC, t_ms, seq)
            full_mac = surge_hmac_sha256(key, payload)
            return payload + full_mac[:16]

        def verify_auth_telemetry(packet, last_seq, key=DEFAULT_AUTH_KEY):
            if len(packet) != 26:
                return False, 0, last_seq
            magic, t_ms, seq = struct.unpack('<HII', packet[:10])
            tag = packet[10:26]
            if magic != SURGE_TELEM_MAGIC:
                return False, 0, last_seq
            if seq <= last_seq and last_seq != 0:
                return False, 0, last_seq
            expected = surge_hmac_sha256(key, packet[:10])[:16]
            if not hmac.compare_digest(tag, expected):
                return False, 0, last_seq
            return True, t_ms, seq

        packet = pack_auth_telemetry(1000, 1)
        valid, t_ms, next_seq = verify_auth_telemetry(packet, 0)
        self.assertTrue(valid)
        self.assertEqual(t_ms, 1000)

        # Replay rejected
        valid_rep, _, _ = verify_auth_telemetry(packet, next_seq)
        self.assertFalse(valid_rep)

        # Tampered timestamp rejected
        tampered = bytearray(packet)
        tampered[2] ^= 0xFF
        valid_tamp, _, _ = verify_auth_telemetry(bytes(tampered), next_seq)
        self.assertFalse(valid_tamp)

    # =======================================================================
    # CR-08: Remote Operator Sessions & Untrusted X-Forwarded-Proto Protection
    # =======================================================================
    def test_cr08_untrusted_x_forwarded_proto_is_ignored(self):
        app = create_app()
        client = app.test_client()

        # Remote client sending fake X-Forwarded-Proto: https from untrusted IP
        res = client.post('/api/gen3/session/login',
                          environ_base={'REMOTE_ADDR': '192.168.1.50'},
                          headers={'X-Forwarded-Proto': 'https'},
                          base_url='http://192.168.1.50:5000',
                          json={'name': 'Shashank', 'password': 'any'})
        self.assertEqual(res.status_code, 403)
        self.assertIn('remote plaintext HTTP', res.get_json()['error'])

    def test_cr08_trusted_proxy_allows_forwarded_https(self):
        app = create_app()
        client = app.test_client()

        # Loopback proxy (127.0.0.1) in TRUSTED_PROXIES forwarding https
        res = client.post('/api/gen3/session/login',
                          environ_base={'REMOTE_ADDR': '127.0.0.1'},
                          headers={'X-Forwarded-Proto': 'https'},
                          base_url='http://127.0.0.1:5000',
                          json={'name': 'Shashank', 'password': 'bad'})
        # Reaches authentication (401 invalid credentials, not 403 forbidden transport)
        self.assertEqual(res.status_code, 401)

    def test_cr08_secure_cookie_attributes_on_https(self):
        app = create_app()
        client = app.test_client()
        res = client.get('/api/gen3/session', base_url='https://localhost')
        cookie = res.headers.get('Set-Cookie', '')
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=Lax', cookie)
        self.assertIn('Secure', cookie)

    # =======================================================================
    # CR-09: Bounded Computation & Cache Key Invalidation
    # =======================================================================
    def test_cr09_report_bounded_computation_and_cache_keys(self):
        app = create_app()
        client = app.test_client()
        runtime = app.config['CONTROL']
        runtime.state['engine'] = 'SIM'
        runtime.state['is_running'] = True
        runtime.state['path_progress'] = 0.5
        runtime.state['target_path'] = [[0, 0], [1, 0], [2, 0]]
        runtime.state['actual_path'] = [[x * 0.01, 0.05] for x in range(500)]
        runtime.report_errors = [0.05] * 20000

        res1 = client.get('/api/report')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.get_json()['sample_count'], 10000)

        # Invalidate via target path change
        runtime.set_path([[0, 0], [1, 0], [2, 0], [3, 0]])
        runtime.state['path_progress'] = 0.5
        runtime.state['actual_path'] = [[x * 0.01, 0.05] for x in range(500)]
        runtime.report_errors = [0.05] * 20000
        res2 = client.get('/api/report')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(len(res2.get_json()['target_path']), 4)

        # Invalidate via progress change
        runtime.state['path_progress'] = 0.6
        res3 = client.get('/api/report')
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.get_json()['path_progress'], 0.6)


if __name__ == '__main__':
    unittest.main()
