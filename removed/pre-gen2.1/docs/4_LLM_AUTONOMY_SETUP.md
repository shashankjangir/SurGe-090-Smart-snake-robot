# LLM Autonomy Setup on Raspberry Pi 5

This guide details how to turn your Raspberry Pi 5 into the "Brain" of the Snake SURGE robot using lightweight Local LLMs.

## 1. Installing Ollama

Ollama is the easiest and most optimized way to run LLMs locally on ARM processors like the Raspberry Pi 5.

To install it, open a terminal on your Raspberry Pi and run:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```
Ollama runs as a background service and exposes a REST API on `localhost:11434`.

## 2. Best Models for Raspberry Pi 5

The Pi 5 relies entirely on its CPU and RAM for AI (it does not have a dedicated AI accelerator out of the box). Therefore, we must use heavily quantized (compressed), small parameter models to achieve real-time responsiveness.

We highly recommend **avoiding Vision/Image models (like LLaVA)**. Analyzing camera frames with a local LLM on a Pi 5 takes several seconds per frame, which is far too slow for real-time robotic control. 

Instead, use these text-based reasoning models:

| Model | Command | RAM Needed | Speed on Pi 5 | Use Case |
|-------|---------|------------|---------------|----------|
| **Qwen 2.5 (0.5B)** | `ollama run qwen2.5:0.5b` | ~0.7 GB | ⚡ Very Fast | Best for rapid JSON outputs and basic steering decisions. |
| **Llama 3.2 (1B)** | `ollama run llama3.2:1b` | ~1.5 GB | 🟢 Fast | Great balance of speed and logical reasoning for obstacle avoidance. |
| **Llama 3.2 (3B)** | `ollama run llama3.2` | ~2.5 GB | 🟡 Moderate | Excellent reasoning, but might cause control-loop lag. |

> [!TIP]
> Start with **Llama 3.2 (1B)**. It is specifically designed by Meta for edge devices and excels at tool calling and JSON formatting.

## 3. Data Processing Architecture (How it Thinks)

Because processing images is too slow, we will feed the LLM **Telemetry & Sensor Data** in plain text (JSON). The LLM acts as the "Decision Maker", while your Python code acts as the "Reflexes".

### What Data goes IN to the LLM?
Instead of a camera, your Python script will construct a text prompt describing the snake's environment based on cheap sensors (like Ultrasonic or LiDAR) and math:
```json
{
  "system_goal": "Reach coordinate (10, 5).",
  "current_pose": {"x": 2.5, "y": 1.0, "heading": "45 degrees"},
  "sensors": {
    "front_obstacle_distance": "0.3m",
    "left_obstacle_distance": "1.2m",
    "right_obstacle_distance": "0.1m"
  }
}
```

### What Data comes OUT of the LLM?
The LLM will be instructed to only reply with a JSON command block. It evaluates the prompt above ("There's an obstacle right in front of me and to my right, but the left is clear") and outputs:
```json
{
  "reasoning": "Obstacle imminent ahead and right. Must steer left to avoid collision while progressing towards target.",
  "command": {
    "turn_offset": 0.5,
    "speed": 0.5
  }
}
```

Your `web_app.py` control loop will parse this JSON and instantly apply `turn_offset = 0.5` to the kinematics engine, forcing the snake to smoothly curve left!
