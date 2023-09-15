import { FastifyInstance } from "fastify";
import { fastifyMultipart } from '@fastify/multipart'
import { pipeline } from "node:stream";
import { promisify } from 'node:util'
import { randomUUID } from "node:crypto";
import { prisma } from '../lib/prisma'
import path from "node:path";
import  fs  from 'node:fs'

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25mb
    }
  })

  app.post('/videos', async ( request, reply ) => {
    const data = await request.file()

    if(!data) {
      return reply.status(400).send({error: 'Missing file input.'})
    }

    const extension = path.extname(data.filename) // retorna a extensão do arquivo

    console.log(extension)

    if(extension !== '.mp3') { 
      return reply.status(400).send({error: 'Invalid file extension. Please upload a MP3.'})
    }

    const fileBaseName = path.basename(data.filename, extension) // buscamos o nome do 
    console.log(fileBaseName)
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}` // criando nome dos uploads
    console.log(fileUploadName)

    const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName) // criando a pasta onde salvar os videos
    console.log(uploadDestination)
  
    await pump(data.file, fs.createWriteStream(uploadDestination))

    // salvando o video dentro do banco de dados
    const video = await prisma.video.create({
      data: {
        name: fileBaseName,
        path: uploadDestination
      }
    })
    
    return {
      video
    }
  })
}

// fastify multipart