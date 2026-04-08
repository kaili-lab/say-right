# 认证学习笔记（当前阶段）

## 1. OAuth 是什么

OAuth 的核心目标不是“登录”本身，而是：

- 让一个客户端代表用户访问某个服务
- 同时避免把用户主密码直接交给客户端

在真实项目里，大家经常把“第三方登录”也叫 OAuth 登录，比如：

- 使用 Google 登录
- 使用 GitHub 登录

但更准确地说，OAuth 更偏“授权协议”；当它被用来做“识别用户身份”时，常常会再结合 OIDC。

---

## 2. 最常见的 OAuth 流程：Authorization Code Flow

这是今天最常见、也是最值得优先理解的一条主线。

以“我的应用支持 Google / GitHub 登录”为例：

### 2.1 参与角色

- 用户：最终要登录的人
- 我的应用：比如 Web 站点、移动端 App、浏览器插件
- OAuth Client：应用中负责发起 OAuth 流程的部分
- Authorization Server：例如 Google、GitHub，或者未来我自己的授权服务器

### 2.2 事前准备

我的应用需要先在授权服务器上注册，通常会拿到：

- `client_id`
- `client_secret`（仅部分客户端安全适合保存）
- `redirect_uri`

### 2.3 完整流程

1. 用户在应用里点击“使用 Google / GitHub 登录”
2. 应用把用户重定向到授权服务器的授权地址
3. 授权服务器展示登录页，用户在那边输入账号密码
4. 用户登录成功后，授权服务器询问是否同意授权
5. 用户同意后，授权服务器把浏览器重定向回应用注册好的 `redirect_uri`
6. 回调地址里会带一个 `authorization code`
7. 应用再拿这个 `code` 去授权服务器的 `token endpoint` 换取 `access token`
8. 应用根据 token 获取用户信息，或者建立自己系统内部的登录态
9. 登录完成

### 2.4 关键理解

- 回调里最推荐带回的是 `code`，不是直接把 token 暴露在跳转 URL 里
- `authorization code` 更像一张短期、一次性的兑换券
- 真正敏感的 token，通常在后续一步单独交换得到

---

## 3. OAuth 2.0 和 OAuth 2.1 的区别

### 3.1 先说结论

- `OAuth 2.0` 是正式标准，已经广泛落地多年
- `OAuth 2.1` 到目前仍处于 draft 阶段，不是正式 RFC
- 但工程实践里，`OAuth 2.1` 代表的是“现代 OAuth 的更安全推荐写法”

所以今天新项目设计时，虽然文档里很多还是写 OAuth 2.0，但思路上应该尽量按 OAuth 2.1 的安全原则来做。

### 3.2 可以把两者理解成什么关系

- OAuth 2.0：原始大框架，选项多，也包含一些今天已经不推荐的新老做法
- OAuth 2.1：把这些年沉淀出的安全最佳实践收进主路径，去掉已经过时或高风险的方式

### 3.3 关键差异

#### OAuth 2.0 历史上常见的 grant

很多教材会讲 4 种常见方式：

- Authorization Code
- Implicit
- Resource Owner Password Credentials
- Client Credentials

这属于“历史分类”，不等于今天都推荐使用。

#### OAuth 2.1 的方向

OAuth 2.1 更强调：

- 优先使用 `Authorization Code`
- 配合 `PKCE`
- 不再推荐 `Implicit Flow`
- 不再推荐 `Password Grant`
- 更严格要求 `redirect_uri` 等安全校验

### 3.4 最值得记住的一句话

- 现在不是“不用 OAuth 2.0”
- 而是“使用 OAuth 2.0 的现代安全实践”
- 而这些现代实践，基本就是 OAuth 2.1 所代表的方向

---

## 4. PKCE 是什么

PKCE 的全称是：

- `Proof Key for Code Exchange`

它的核心目的不是保护密码，而是：

- **保护 Authorization Code**
- 防止 `authorization code` 在传递过程中被截获后，被攻击者拿去换 token

### 4.1 为什么会需要 PKCE

如果没有 PKCE，那么谁拿到 `authorization code`，谁就可能去换 token。

这在这些客户端里风险更高：

- 移动端 App
- 浏览器插件
- SPA
- 桌面客户端

因为这类客户端通常属于 public client，无法像后端服务那样安全保存长期秘密。

### 4.2 PKCE 的核心思想

客户端在登录开始前，先生成两样东西：

- `code_verifier`：一个高熵随机字符串，只保存在客户端本地
- `code_challenge`：根据 `code_verifier` 算出来的结果

常见推荐方式是：

- `code_challenge = BASE64URL(SHA256(code_verifier))`

授权开始时，客户端先把：

- `code_challenge`
- `code_challenge_method=S256`

发给授权服务器。

等到后面用 `authorization code` 去换 token 时，客户端再把真正的：

- `code_verifier`

发给服务器。

服务器会使用同样的算法重新计算：

- 用收到的 `code_verifier`
- 再算一遍 `code_challenge`
- 比较是否和最开始记录的值一致

如果一致，才发 token。

### 4.3 最值得记住的一句话

- PKCE 保护的是授权码流程
- 它不是万能防护
- 它主要防的是：`authorization code` 被中途截获后被冒用

---

## 5. PKCE 的完整流程

这里以“移动端 App 登录自己的服务”为例。

### 5.1 授权开始前

App 本地先生成：

- `code_verifier`
- `code_challenge`

同时还会带上：

- `client_id`
- `redirect_uri`
- `state`
- `scope`

### 5.2 发起授权请求

App 拉起系统浏览器或系统认证会话，访问类似：

- `/authorize?client_id=...`
- `&redirect_uri=...`
- `&response_type=code`
- `&scope=...`
- `&state=...`
- `&code_challenge=...`
- `&code_challenge_method=S256`

### 5.3 用户在浏览器里登录

用户看到的是授权服务器提供的登录页：

- 输入用户名密码
- 或进行 MFA / Passkey 等认证

这里的关键点是：

- 密码输入给授权服务器页面
- 不是直接交给移动端 App 代码

### 5.4 授权成功并回调

用户登录并同意授权后，授权服务器重定向回 App 注册好的回调地址：

- `myapp://callback?code=...&state=...`

注意：

- 此处最推荐回传的是 `authorization code`
- 不是直接把 access token 放在回调 URL 里

### 5.5 App 校验 state

App 要先确认：

- 回来的 `state`
- 与最开始发出去的 `state`

是否一致。

如果不一致，应拒绝继续流程。

### 5.6 App 用 code + verifier 换 token

App 然后请求授权服务器的 token endpoint，提交：

- `authorization code`
- `code_verifier`

### 5.7 服务器做 PKCE 校验

服务器会：

1. 取出这个 `code` 对应的授权记录
2. 找到其中保存的 `code_challenge`
3. 用收到的 `code_verifier` 按相同算法再算一次
4. 看计算结果是否一致

如果一致：

- 发 `access token`
- 按设计需要决定是否发 `refresh token`

如果不一致：

- 拒绝发 token

### 5.8 登录完成

客户端最终得到：

- `access token`
- 可能还有 `refresh token`

此时才真正完成登录并可调用后续 API。

---

## 6. PKCE 到底防什么，不防什么

### 6.1 PKCE 主要防什么

- `authorization code` 在 redirect / callback 过程中被截获
- 攻击者拿到 code 后，试图自己去换 token

### 6.2 PKCE 不防什么

PKCE 不是“全能安全方案”，它不主要解决这些问题：

- 客户端设备已经被深度攻破
- 攻击者已经能读取 App 内存或 Hook 运行时
- token 本身已被盗取
- 用户被钓鱼到假登录页
- 授权服务器本身被攻破

### 6.3 一个非常重要的理解

PKCE 的安全性不是靠“算法保密”，而是靠：

- `code_verifier` 不泄漏

也就是说：

- 攻击者知道算法是正常的
- 攻击者知道用的是 `S256` 也没关系
- 真正关键是：他能不能拿到这次登录对应的 `code_verifier`

### 6.4 结论

- PKCE 不是万能的
- 但它是现代 OAuth 授权码流程里非常重要的一层基础防护

---

## 7. 当前项目应该怎么理解这些知识

当前项目主线是：

- Web 前端
- 后端 session / cookie 登录

所以：

- 当前网页登录链路本身不需要因为“只有 Web 前端”而强行引入 PKCE

但如果后续要接入：

- 移动端 App
- Chrome 扩展
- 其他外部客户端

那更合理的方向通常是：

- Web 继续走现有 session / cookie
- 外部客户端新增 `Authorization Code + PKCE`

也就是：

- Web 用 session
- App / 插件用 OAuth 授权码 + PKCE + Bearer token

---

## 8. 我当前最该记住的内容

- OAuth 的核心价值是：**不要把用户主密码直接交给客户端**
- 最常见、最值得优先掌握的 OAuth 流程是：`Authorization Code Flow`
- OAuth 2.1 虽然还是 draft，但它代表了现代 OAuth 的安全方向
- PKCE 是给授权码流程加的一把锁，主要防止 `authorization code` 被截获后被冒用
- PKCE 不是万能安全方案，但对移动端、插件、SPA 这类场景非常重要
- 如果以后本项目要接移动端或浏览器插件，应该认真考虑 `Authorization Code + PKCE`
