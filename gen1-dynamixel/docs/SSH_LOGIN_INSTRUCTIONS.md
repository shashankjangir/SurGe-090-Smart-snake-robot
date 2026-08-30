# Raspberry Pi SSH Login Instructions

These are the step-by-step instructions to log into the Raspberry Pi from your Windows computer.

## Prerequisites
- Ensure your Raspberry Pi is powered on.
- Ensure your Raspberry Pi is on the same network as your PC. This means EITHER:
  - You have an **Ethernet cable** directly connecting the Pi to your PC.
  - OR, both devices are connected to the same **Wi-Fi network / hotspot**.

## Login Steps

**Step 1: Open PowerShell**
1. Press the **Windows Key** on your keyboard.
2. Type `PowerShell` and press **Enter**.

**Step 2: Enter the SSH Command**
In the PowerShell window, type the following command and press **Enter**:
```powershell
ssh smartsnake@snakerobo.local
```

**Step 3: Security Prompt (First Time Only)**
If you see a message asking: `Are you sure you want to continue connecting (yes/no/[fingerprint])?`
Type `yes` and press **Enter**.

**Step 4: Enter Password**
When prompted for the password, type:
```text
<REDACTED — set your own; never commit>
```
*Note: The password will **not** appear on the screen as you type it. This is a normal security feature. Just type the characters and press **Enter**.*

> **⚠️ Security:** Change the default Raspberry Pi password immediately after first login using the `passwd` command.

## Success!
Once you see the prompt change to `smartsnake@snakerobo:~ $`, you are successfully logged into the Raspberry Pi and can start running commands.
