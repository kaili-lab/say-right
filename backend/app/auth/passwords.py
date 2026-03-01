"""密码哈希与校验工具。"""

from pwdlib import PasswordHash


_password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """把明文密码转换为安全哈希，避免明文入库。"""
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """校验明文密码与哈希是否匹配。"""
    # 无效 hash 在不同后端实现下会抛不同异常，这里统一吞掉并返回 False，
    # 保证上层认证流程只处理“校验失败”这一种语义。
    try:
        return _password_hasher.verify(password, password_hash)
    except Exception:
        return False
