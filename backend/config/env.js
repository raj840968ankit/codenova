import z from 'zod'

export const env = z.object({
    MONGODB_URI : z.string(),
    JWT_SECRET : z.string(),
    CLIENT_URL : z.string(),
    GOOGLE_AI_KEY : z.string()
}).parse(process.env)

