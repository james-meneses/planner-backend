import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import { dayjs } from "../lib/dayjs";

import nodemailer from "nodemailer";

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/trips/:tripId/confirm/:participantId",
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
          participantId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { tripId, participantId } = request.params;

      return reply.redirect(`http://localhost:3000/trips/${tripId}`);

      // return {
      //   tripdId: request.params.tripId,
      // };
    }
  );
}
