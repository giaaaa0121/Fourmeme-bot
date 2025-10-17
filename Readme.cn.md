[English](./Readme.md)

# 🧰 Four.meme (BNB) 工具包

![](./banner.png)

## 🚀 入门

### 先决条件
在开始之前，请确保已安装并配置以下内容:
- [🟢 Node.js v22.15+](https://nodejs.org/en/download)
- 🌐 BNB 链 RPC 端点（可使用默认公共 RPC）
- 🔑 已注资的钱包私钥

### 1. 安装依赖项
克隆存储库并安装项目依赖项:
```bash
git clone https://github.com/angel10x/Fourdotmeme-bot.git

cd Fourdotmeme-bot

npm install
```

### 2. 环境设置
通过复制示例配置来创建你的 `.env` 文件:
```bash
cp .env.example .env
```
然后使用您的钱包私钥和 RPC 端点更新必填字段。

  💡 PancakeSwap 路由器和 WBNB 主网的默认值已提供。

### 3. 构建项目
编译 TypeScript 源代码:
```bash
npm run build
```
这将在 /dist 目录中生成可用于生产的版本。

### 4. 运行项目
```bash
npm run start
```

## ⚙️ 项目概况
该工具包专为在 BNB 链上构建自动交易机器人、流动性策略和实用程序脚本的开发人员打造。

它包含以下模块：
- 🪙 代币兑换和流动性交互
- 💰 自动交易量生成
- 🔄 自定义交易执行逻辑
- 🧩 可扩展合约集成

---