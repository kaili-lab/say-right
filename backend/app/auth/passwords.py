from pwdlib import PasswordHash


_password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    # 无效 hash 在不同后端实现下会抛不同异常，这里统一吞掉并返回 False，
    # 保证上层认证流程只处理“校验失败”这一种语义。
    try:
        return _password_hasher.verify(password, password_hash)
    except Exception:
        return False
