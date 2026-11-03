# How I check the Gen 2 code

I run software checks without connecting a servo or opening a serial port. From the repository root:

```powershell
python -m unittest discover -s generations/gen2-st3215/tests -p test_offline.py
python -m unittest discover -s tests -p test_gen2_1.py
```

The offline checks cover packet framing, feedback, cleanup, gait bounds and host behaviour. The Gen 2.1 suite also checks the merged bench launcher's modes, invalid input and alignment-fault cleanup. Live motor/servo tools are separate and must be selected deliberately.

## Native C++ checks

With a C++17 compiler and its runtime DLL directory on PATH:

```powershell
g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_receiver.cpp -o "$env:TEMP/surge-receiver-test.exe"
& "$env:TEMP/surge-receiver-test.exe"
g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_transmitter.cpp -o "$env:TEMP/surge-transmitter-test.exe"
& "$env:TEMP/surge-transmitter-test.exe"
g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_ota_credentials.cpp -o "$env:TEMP/surge-ota-test.exe"
& "$env:TEMP/surge-ota-test.exe"
```

This PC has a compiler under C:/Strawberry/c/bin. The OTA update work ran the receiver, transmitter, credential and legacy-firmware test programs successfully using that compiler. The earlier note saying no host compiler was available is historical.

The test doubles model queues, time, serial data and servo registers. They do not measure real radio concurrency, electrical timing, clearance or loads. More C++ checks, including the older firmware, serial sweep and text-packet regression, remain in this directory. The text-packet test name refers to the earlier authenticated protocol; normal maintained radio commands are now plain text.

## Build firmware

```powershell
pio run -e receiver_gen2_1 -e transmitter_gen2_1
```

This builds without uploading. The [folder guide](../../../docs/REPOSITORY_LAYOUT.md) lists wider checks, and the [OTA guide](../../../docs/operations/FIRMWARE_OTA.md) covers installation. Passing a software test does not certify a physical stop or an installed electrical protection.
