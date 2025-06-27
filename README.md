# Game Simulation

This repository contains a simple 2D simulation of two teams of soldiers battling each other. It is implemented using **pygame**.

## Running the simulation

1. Install the dependencies (pygame):
   ```bash
   pip install pygame
   ```
2. Run the script:
   ```bash
   python src/simulation.py
   ```

Each team starts with 10 soldiers that move and spin around the arena. Soldiers bounce off walls and each other. When hit by the sharp side of an opponent's sword they die and fade to grey. The simulation ends when one team has no soldiers left.
