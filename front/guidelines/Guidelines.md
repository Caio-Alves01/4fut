Banco é MySQL, database PIT, localhost:3306, user

Tabela: Users (colunas Id, Name, Email, PasswordHash, CreatedAt).

 ver os dados:

MySQL Workbench / DBeaver / HeidiSQL — conecta emenha vazia, abre schema PIT → tabela Users.

Ou via terminal:

mysql -u root -h localhost -P 3306

;

SELECT * FROM Users;