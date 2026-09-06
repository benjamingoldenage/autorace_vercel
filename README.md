# 🏎️ AutoRace - 3D Arcade Racing Web Game

**AutoRace** is a high-octane 3D arcade car racing browser game built with Three.js and the Web Audio API. It features 3 unique tracks, 2 competitive AI bot racers, a drift and stunt cash reward system, an in-depth tuning Market, a 3D interactive Garage, a global Leaderboard ranked by races completed, and procedural audio synthesis.

Optimized for **instant, zero-config deployment to Vercel**.

---

## 🎮 Game Features

1. **English Arcade Main Menu**:
   - **Play**: Opens the Track Selection menu.
   - **Market (Shop)**: Purchase new sports cars, hypercars, engines, gearboxes, exhausts, tires, and paint colors with in-game cash.
   - **Garage**: 3D interactive turntable viewer to inspect your car, equip purchased performance parts, and apply liveries.
   - **Leaderboard**: Displays career stats and ranks racers primarily by **Races Completed** and victories.
   - **Audio Controls**: Toggle procedural Synthwave BGM and sound effects on/off anytime.

2. **3 Unique Racing Tracks**:
   - 🏙️ **Neon City Speedway**: Cyberpunk metropolis night circuit with glowing neon skyscrapers and 90-degree street corners.
   - 🏜️ **Desert Canyon Rally**: Dusty sandstone canyon terrain with sweeping drift curves and elevation changes.
   - 🌴 **Coastal Sunset Circuit**: Scenic seaside causeway with palm trees, ocean water shaders, and technical chicanes.

3. **Intelligent AI Bots & Rewards**:
   - Race against 2 dynamic bot racers (**BlazeBot** & **PhantomAI**) with pathfinding, speed adaptation, and overtaking AI.
   - **1st Place Win Bonus**: **+$100 Cash** added directly to your wallet!
   - 2nd Place: +$50 | 3rd Place: +$25.
   - **Drift Rewards**: Sustained sideways slides award continuous cash bonuses based on drift angle, speed, and combo multipliers!
   - **Clean Apex Turns**: High-speed cornering through difficult bends without crashing awards an instant **+$20 Stunt Bonus**!

4. **Tuning Market & 3D Garage**:
   - **Cars**: Apex GT, Viper R, Drift King 240, Hyperion EVO.
   - **Upgrades**:
     - *Exhaust (Egzoz)*: Sport Twin-Pipe, Titanium Race Exhaust (increases top speed and nitro power).
     - *Tires (Tekerlek)*: Sport Radials, Pro Drift Slicks (increases handling and drift agility).
     - *Engine (Motor)*: Turbo Stage 1, Twin-Turbo V8 (increases top speed and acceleration).
     - *Transmission (Şanzıman)*: Quickshift Sport, Sequential Racing (boosts acceleration and removes shift delay).
     - *Paints (Boya)*: Crimson Red, Electric Blue, Cyber Mint, Sunset Gold, Midnight Violet, Stealth Black, Neon Hot Pink, Pearl White.

5. **Procedural Web Audio API Engine**:
   - Realistic engine RPM sound with harmonic overtones and pitch shifting.
   - High-speed tire screech filtered noise on hard drifts.
   - Nitro whoosh sound effect.
   - 80s arcade synthwave music loop running smoothly in the browser with no external MP3 dependencies.

---

## 🕹️ Controls

| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Steer Left / Right** | `A` / `D` or `◀` / `▶` | Left / Right Buttons |
| **Accelerate (Gas)** | `W` or `▲` | GAS Button |
| **Brake / Reverse** | `S` or `▼` | BRAKE Button |
| **Handbrake (Drift)** | `SPACEBAR` | DRIFT Button |
| **Nitro Boost (NOS)** | `SHIFT` | NOS Button |
| **Switch Camera** | `C` (Chase / Hood / Far) | CAM Button |
| **Pause / Return** | `ESC` | Pause Button |

---

## 🚀 How to Deploy to Vercel

### Option 1: Deploy with Vercel CLI (Fastest)

1. Open your terminal in the game folder:
   ```bash
   cd apps/autorace
   ```
2. Run the Vercel deploy command:
   ```bash
   npx vercel
   ```
3. Follow the CLI prompts (accept defaults). Your game will be live on `https://your-project.vercel.app` in under 30 seconds!

### Option 2: Deploy via GitHub & Vercel Dashboard

1. Push this repository to your GitHub account.
2. Log into [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Set the **Root Directory** to `apps/autorace`.
5. Click **"Deploy"**. No build commands are needed since it is a pure static web application.

---

## 💻 Local Testing

You can run a local test server using Python:

```bash
cd apps/autorace
python3 -m http.server 8080
```

Open `http://localhost:8080` in your web browser to play!
# autorace_vercel
