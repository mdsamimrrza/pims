import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import router from './routes/index.js'
import { errorHandler, notFound } from './middlewares/error.middleware.js'

const app = express()

app.use(cors())
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

// API routes
app.use('/api', router)

app.use(notFound)
app.use(errorHandler)

export default app
