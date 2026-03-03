import dotenv from 'dotenv';

dotenv.config();

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: Number.parseInt(process.env.PORT, 10) || 3000,
    mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number.parseInt(process.env.MYSQL_PORT || '3306', 10),
        database: process.env.MYSQL_DATABASE || 'wtd_db',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'password',
    },
}