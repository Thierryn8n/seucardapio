-- Inserir opções de exemplo para produtos
-- Primeiro, vamos criar grupos de opções para produtos existentes

-- Grupo de opções para Tamanho (ex: para pizzas)
INSERT INTO product_option_groups (product_id, name, min_selections, max_selections, required, display_order) VALUES
('produto_exemplo_1', 'Tamanho', 1, 1, true, 1),
('produto_exemplo_1', 'Borda', 0, 1, false, 2),
('produto_exemplo_2', 'Tamanho', 1, 1, true, 1);

-- Opções para o grupo Tamanho
INSERT INTO product_options (option_group_id, name, additional_price, available, display_order) VALUES
-- Opções para o primeiro grupo (Tamanho da pizza 1)
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_1' AND name = 'Tamanho' LIMIT 1), 'Pequena', 0, true, 1),
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_1' AND name = 'Tamanho' LIMIT 1), 'Média', 15.00, true, 2),
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_1' AND name = 'Tamanho' LIMIT 1), 'Grande', 25.00, true, 3),
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_1' AND name = 'Tamanho' LIMIT 1), 'Família', 35.00, true, 4),

-- Opções para o grupo Borda
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_1' AND name = 'Borda' LIMIT 1), 'Tradicional', 0, true, 1),
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_1' AND name = 'Borda' LIMIT 1), 'Cheddar', 5.00, true, 2),
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_1' AND name = 'Borda' LIMIT 1), 'Catupiry', 5.00, true, 3),
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_1' AND name = 'Borda' LIMIT 1), 'Chocolate', 8.00, true, 4),

-- Opções para o segundo grupo (Tamanho da pizza 2)
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_2' AND name = 'Tamanho' LIMIT 1), 'Individual', 0, true, 1),
((SELECT id FROM product_option_groups WHERE product_id = 'produto_exemplo_2' AND name = 'Tamanho' LIMIT 1), 'Grande', 20.00, true, 2);

-- Para testar, você pode usar este comando para ver os dados inseridos:
-- SELECT 
--   pog.name as group_name,
--   pog.required,
--   pog.min_selections,
--   pog.max_selections,
--   po.name as option_name,
--   po.additional_price
-- FROM product_option_groups pog
-- LEFT JOIN product_options po ON po.option_group_id = pog.id
-- WHERE pog.product_id = 'produto_exemplo_1'
-- ORDER BY pog.display_order, po.display_order;