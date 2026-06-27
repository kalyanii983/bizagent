import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';
import { APP_NAME } from './config/constants.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.nodeEnv === 'development' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        return callback(null, true);
      }
      if (origin === env.clientOrigin) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));
  app.use(compression());
  app.use(cookieParser());
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: APP_NAME });
  });

  app.use('/api', apiRoutes);

  return app;
}
