"""Session, role enforcement, and operator lease manager for Gen 3.

Enforces two roles:
- Viewer (default for everyone, no login required, read-only + STOP access)
- Operator (login required, exactly three allowed names: Shashank, Bhavesh, Mahima,
  shared password verified with hmac.compare_digest).

Only ONE operator may be active at a time. A second operator logging in while another
is active becomes a viewer with an informative message.
Operator lease is renewed via heartbeats (1.0s interval, 3.0s timeout). Expiry commands STOP.
"""
import copy
import hmac
import json
from pathlib import Path
import time
import uuid

ALLOWED_OPERATORS = ('Shashank', 'Bhavesh', 'Mahima')
CANONICAL_NAMES = {name.lower(): name for name in ALLOWED_OPERATORS}
_p2 = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = (_p2 if _p2.name == 'gen3-experimental-3d' else _p2 / 'gen3-experimental-3d') / 'operators.json'


def load_operators_config(config_path=None):
    path = Path(config_path or DEFAULT_CONFIG_PATH)
    if path.is_file():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                names = data.get('operators', ALLOWED_OPERATORS)
                password = data.get('password')
                if (isinstance(names, (list, tuple)) and names
                        and all(n in ALLOWED_OPERATORS for n in names)
                        and isinstance(password, str) and password):
                    return {'operators': tuple(names), 'password': password}
        except Exception:
            pass
    return {'operators': ALLOWED_OPERATORS, 'password': ''}


class SessionManager:
    HEARTBEAT_INTERVAL = 1.0
    LEASE_TIMEOUT = 3.0

    def __init__(self, heartbeat_interval=1.0, lease_timeout=LEASE_TIMEOUT, config_path=None):
        self.heartbeat_interval = heartbeat_interval
        self.lease_timeout = lease_timeout
        self.config_path = config_path
        self._config = load_operators_config(config_path)
        self.allowed_operators = tuple(self._config['operators'])
        self.canonical_map = {n.lower(): n for n in self.allowed_operators}
        self.sessions = {}
        self.active_operator = None

    def get_or_create(self, session_id=None):
        now = time.monotonic()
        if session_id and session_id in self.sessions:
            session = self.sessions[session_id]
            session['last_seen'] = now
            return session

        new_id = f"s_{uuid.uuid4().hex[:16]}"
        session = {
            'session_id': new_id,
            'role': 'viewer',
            'name': 'Viewer',
            'created_at': now,
            'last_seen': now
        }
        self.sessions[new_id] = session
        return session

    def authenticate(self, name, password):
        if not name or not isinstance(name, str):
            return False, None, 'Invalid operator name'
        canonical = self.canonical_map.get(name.strip().lower())
        if not canonical:
            return False, None, 'Invalid operator name: allowed operators are Shashank, Bhavesh, Mahima'

        expected_pw = self._config['password']
        if not expected_pw:
            return False, None, 'Operator credentials are not configured'
        if not password or not isinstance(password, str):
            return False, None, 'Incorrect password'

        is_valid = hmac.compare_digest(password.encode('utf-8'), expected_pw.encode('utf-8'))
        if not is_valid:
            return False, None, 'Incorrect password'
        return True, canonical, None

    def login(self, session_id, name, password, busy_with_motion=False):
        now = time.monotonic()
        valid, canonical_name, err = self.authenticate(name, password)
        if not valid:
            return {'success': False, 'error': err}

        session = self.get_or_create(session_id)

        # Check if an operator lease is currently active
        is_active = bool(self.active_operator and (self.lease_timeout is None or now < self.active_operator['expires_at']))
        if is_active:
            if self.active_operator['session_id'] == session['session_id']:
                # Already holding lease; renew it
                self.active_operator['name'] = canonical_name
                self.active_operator['last_heartbeat'] = now
                self.active_operator['expires_at'] = (now + self.lease_timeout) if self.lease_timeout else float('inf')
                session['role'] = 'operator'
                session['name'] = canonical_name
                return {
                    'success': True,
                    'role': 'operator',
                    'operator_name': canonical_name,
                    'message': f'Active operator lease renewed for {canonical_name}'
                }

            # Another operator is active! Second operator becomes viewer
            active_name = self.active_operator['name']
            session['role'] = 'viewer'
            session['name'] = canonical_name
            return {
                'success': True,
                'role': 'viewer',
                'active_operator': active_name,
                'message': f'{active_name} is currently operating'
            }

        # If motion is currently busy from an expired operator, handoff must wait for stop
        if busy_with_motion:
            return {'success': False, 'error': 'Stop motion before transferring operator ownership'}

        # Grant active operator lease
        self.active_operator = {
            'session_id': session['session_id'],
            'name': canonical_name,
            'acquired_at': now,
            'last_heartbeat': now,
            'expires_at': (now + self.lease_timeout) if self.lease_timeout else float('inf')
        }
        session['role'] = 'operator'
        session['name'] = canonical_name
        return {
            'success': True,
            'role': 'operator',
            'operator_name': canonical_name,
            'message': f'Logged in as {canonical_name}'
        }

    def logout(self, session_id, busy_with_motion=False):
        session = self.sessions.get(session_id)
        if not session:
            return {'success': True}

        if self.active_operator and self.active_operator['session_id'] == session_id:
            if busy_with_motion:
                raise RuntimeError('Stop motion before releasing operator lease')
            self.active_operator = None

        session['role'] = 'viewer'
        session['name'] = 'Viewer'
        return {'success': True}

    def release_operator(self, session_id, busy_with_motion=False):
        return self.logout(session_id, busy_with_motion=busy_with_motion)

    def heartbeat(self, session_id):
        now = time.monotonic()
        if self.is_operator(session_id):
            self.active_operator['last_heartbeat'] = now
            if self.lease_timeout:
                self.active_operator['expires_at'] = now + self.lease_timeout
                return {'active': True, 'expires_in': round(self.lease_timeout, 2)}
            self.active_operator['expires_at'] = float('inf')
            return {'active': True, 'expires_in': None}
        return {'active': False, 'expires_in': 0.0}

    def check_lease_expiry(self):
        """Returns (is_expired, expired_operator_info)."""
        if self.lease_timeout is None:
            return False, None
        now = time.monotonic()
        if self.active_operator and now >= self.active_operator['expires_at']:
            expired = self.active_operator
            self.active_operator = None
            if expired['session_id'] in self.sessions:
                self.sessions[expired['session_id']]['role'] = 'viewer'
            return True, expired
        return False, None

    def is_operator(self, session_id):
        if not self.active_operator or self.active_operator['session_id'] != session_id:
            return False
        if self.lease_timeout is None:
            return True
        return time.monotonic() < self.active_operator['expires_at']

    def get_operator_name(self, session_id):
        session = self.sessions.get(session_id)
        if session and session.get('role') == 'operator' and self.is_operator(session_id):
            return session.get('name')
        if self.active_operator and session_id == self.active_operator['session_id']:
            return self.active_operator.get('name')
        return None

    def status(self, current_session_id=None):
        now = time.monotonic()
        is_active = bool(self.active_operator and (self.lease_timeout is None or now < self.active_operator['expires_at']))
        expires_in = max(0.0, self.active_operator['expires_at'] - now) if (is_active and self.lease_timeout) else 0.0
        current_session = self.sessions.get(current_session_id) if current_session_id else None
        return {
            'has_active_operator': is_active,
            'active_operator': self.active_operator['name'] if is_active else None,
            'operator_name': self.active_operator['name'] if is_active else None,
            'is_current_operator': bool(is_active and current_session_id and self.active_operator['session_id'] == current_session_id),
            'expires_in': round(expires_in, 2) if self.lease_timeout else None,
            'heartbeat_interval': self.heartbeat_interval,
            'lease_timeout': self.lease_timeout,
            'allowed_operators': list(self.allowed_operators),
            'current_user': {
                'session_id': current_session['session_id'],
                'name': current_session['name'],
                'role': current_session['role']
            } if current_session else None
        }
