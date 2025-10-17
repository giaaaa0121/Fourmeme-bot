[简体中文](./Readme.cn.md)

# 🧰 Four.meme (BNB) Toolkit

![](./banner.png)

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed and configured:
- [🟢 Node.js v22.15+](https://nodejs.org/en/download)
- 🌐 A BNB Chain RPC endpoint (the default public RPC can be used)
- 🔑 A funded wallet private key

### 1. Install Dependencies
Clone the repository and install project dependencies:
```bash
git clone https://github.com/angel10x/Fourdotmeme-bot.git

cd Fourdotmeme-bot

npm install
```

### 2. Environment setup
Create your `.env` file by copying the example configuration:
```bash
cp .env.example .env
```
Then update the required fields with your wallet private key and RPC endpoint.

  💡 Default values for PancakeSwap Router and WBNB mainnet are already provided.

### 3. Build the Project
Compile the TypeScript source code:
```bash
npm run build
```
This generates the production-ready build in the /dist directory.

### 4. Run the Project
```bash
npm run start
```

## ⚙️ Project Overview
This toolkit is built for developers building automated trading bots, liquidity strategies, and utility scripts on the BNB Chain.

It includes modules for:
- 🪙 Token swaps and liquidity interactions
- 💰 Automated volume generation
- 🔄 Custom trade execution logic
- 🧩 Extendable contract integrations

---