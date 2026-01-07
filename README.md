# SolTap

**Boost your reaction speed and sharpen your reflexes with SolTap—the ultimate Web3-powered Reaction Time Test!**

Designed for simplicity, speed, and competition, SolTap puts your skills to the ultimate test. Tap the moment the screen changes color and see your reactions measured down to the millisecond.

<img src="screenshots/home.png" alt="SolTap App Preview" width="300" />
*(Note: Add more screenshots to the `screenshots/` folder to showcase game modes like `reaction.png`, `multi.png`, etc.)*

## 🎮 Game Modes

Explore exciting game modes that challenge your reflexes and precision:

*   **⚡ Classic Reaction Test**: The OG challenge. Wait for the green light and tap instantly to prove your speed.
*   **🎯 Multi-Zone**: Test your cognitive reflexes. Identify and tap the correct active zones as they light up across the grid.
*   **🚀 Speed Run**: A high-speed survival mode. Hit the targets before they vanish—it gets faster with every successful tap. Can you keep up?

## 🏆 Compete on Solana

Prove your skills on the global **Solana Leaderboard**.

*   **On-Chain Verification**: Securely sign your high scores on-chain. This "Proof of Reaction" prevents bots and ensures a cheat-free environment where only the fastest fingers survive.
*   **Solana Pay Integration**: Deep links with Phantom/Solflare for seamless signing.
*   **Global Rankings**: Track your proven speed against players worldwide.

## 🛠 Tech Stack

*   **Frontend**: React Native (Expo)
*   **Blockchain**: Solana Web3.js
*   **Backend/DB**: Supabase (PostgreSQL) for Leaderboard caching
*   **Wallet Integration**: Solana Pay / Deep Linking

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/jessebias/soltap.git
    cd soltap
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file with your credentials:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
    EXPO_PUBLIC_HOUSE_ADDRESS=your_solana_wallet_address
    EXPO_PUBLIC_RPC_URL=your_solana_rpc_url
    ```

4.  **Run the App**
    ```bash
    npm run android
    # or
    npm run ios
    ```



