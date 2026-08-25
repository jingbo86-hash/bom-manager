-- 数据库迁移脚本：自动添加缺失的列
-- 用法：在 deploy.bat 中调用 CALL MigrateDatabase();

DROP PROCEDURE IF EXISTS MigrateDatabase;
DELIMITER //
CREATE PROCEDURE MigrateDatabase()
BEGIN
  DECLARE _db VARCHAR(64) DEFAULT 'bom_system';
  DECLARE done INT DEFAULT 0;
  DECLARE _table VARCHAR(64);
  DECLARE _column VARCHAR(64);
  DECLARE _type VARCHAR(255);
  DECLARE _after VARCHAR(64);
  
  DECLARE cur CURSOR FOR 
    SELECT t, c, col_type, col_after FROM (
      SELECT 'parts' AS t, 'price' AS c, 'DECIMAL(12,2) DEFAULT 0.00' AS col_type, 'unit' AS col_after
      UNION SELECT 'parts', 'quantity', 'DECIMAL(12,4) DEFAULT 0.0000', 'price'
    ) AS cols
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = _db AND TABLE_NAME = t AND COLUMN_NAME = c
    );
    
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
  OPEN cur;
  REPEAT
    FETCH cur INTO _table, _column, _type, _after;
    IF NOT done THEN
      SET @sql = CONCAT('ALTER TABLE ', _table, ' ADD COLUMN ', _column, ' ', _type, ' AFTER ', _after);
      PREPARE stmt FROM @sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
  UNTIL done END REPEAT;
  CLOSE cur;
END//
DELIMITER ;

CALL MigrateDatabase();
DROP PROCEDURE IF EXISTS MigrateDatabase;