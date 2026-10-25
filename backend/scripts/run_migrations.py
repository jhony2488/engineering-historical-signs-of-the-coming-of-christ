#!/usr/bin/env python
"""
Script para aplicar migrations SQL do PostgreSQL.
Uso: python scripts/run_migrations.py
"""
import sys
from pathlib import Path

# Adicionar diretório backend ao PYTHONPATH
backend_root = Path(__file__).parent.parent
sys.path.insert(0, str(backend_root))

from motor.adapters.postgres import PostgresClient

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


def run_migrations():
    """Aplica todas as migrations SQL em ordem alfabética."""
    client = PostgresClient()

    if not client.is_configured:
        print("❌ DATABASE_URL não configurada")
        return

    # Abrir o pool de conexões
    if client._pool and not client._pool._opened:
        client._pool.open()

    # Listar migrations em ordem
    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

    if not migration_files:
        print(f"❌ Nenhuma migration encontrada em {MIGRATIONS_DIR}")
        return

    print(f"📂 Encontradas {len(migration_files)} migrations")
    print(f"📂 Diretório: {MIGRATIONS_DIR}\n")

    for migration_file in migration_files:
        print(f"📝 Aplicando: {migration_file.name}")

        try:
            with migration_file.open("r", encoding="utf-8") as f:
                sql_content = f.read()

            # Executar SQL
            with client._pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql_content)
                conn.commit()

            print(f"✅ {migration_file.name} aplicada com sucesso\n")

        except Exception as e:
            print(f"❌ Erro ao aplicar {migration_file.name}: {e}\n")
            client.close()
            raise

    client.close()
    print("🎉 Todas as migrations aplicadas com sucesso!")


if __name__ == "__main__":
    run_migrations()
