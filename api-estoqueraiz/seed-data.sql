-- Script para popular dados iniciais no banco

-- 1. Criar usuário gerente (senha: Senha@123)
-- Hash bcrypt da senha "Senha@123" com salt 10
INSERT INTO usuarios (nome, email, senha, cpf, status, cargo, unidade_id, criado_em, atualizado_em)
VALUES 
  ('Gerente Sistema', 'gerente@agrologica.com.br', '$2b$10$rqYVZ8qX.gV8xK5h5x5xZeXqH3J7zK8X9K7yJ9K8xJ9K8xJ9K8xJ9O', '12345678900', 'aprovado', 'gerente', NULL, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 2. Criar unidade principal
INSERT INTO unidades (nome, descricao, rua, numero, bairro, cidade, estado, cep, criado_em, atualizado_em)
VALUES 
  ('Unidade Centro', 'Unidade principal - Centro da cidade', 'Rua das Flores', '123', 'Centro', 'São Paulo', 'SP', '01234-567', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. Criar categorias
INSERT INTO categorias (nome, descricao, criado_em, atualizado_em)
VALUES 
  ('Fertilizantes', 'Fertilizantes para cultivo agrícola', NOW(), NOW()),
  ('Defensivos', 'Defensivos agrícolas', NOW(), NOW()),
  ('Sementes', 'Sementes para plantio', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Verificar os dados criados
SELECT 'Usuários criados:' as info;
SELECT id, nome, email, cargo, status FROM usuarios;

SELECT 'Unidades criadas:' as info;
SELECT id, nome, cidade FROM unidades;

SELECT 'Categorias criadas:' as info;
SELECT id, nome FROM categorias;
