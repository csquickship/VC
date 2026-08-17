import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  frontendOrigin: string;
}

export const config: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
};
