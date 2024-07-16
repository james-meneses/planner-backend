import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import { dayjs } from "../lib/dayjs";

import nodemailer from "nodemailer";

export async function createInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips/:tripId/invites",
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          email: z.string().email(),
        }),
      },
    },
    async (request) => {
      const { tripId } = request.params;
      const { email } = request.body;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip) throw new Error("Trip not found");

      const participant = await prisma.participant.create({
        data: {
          email,
          trip_id: tripId,
        },
      });

      const formattedStartDate = dayjs(trip.starts_at).format("LL");
      const formattedEndDate = dayjs(trip.ends_at).format("LL");

      const mail = await getMailClient();

      try {
        const confirmationLink = `http://localhost:3333/participants/${participant.id}/confirm`;

        const message = await mail.sendMail({
          from: {
            name: "Equipe planner",
            address: "oi@planner",
          },
          to: participant.email,
          subject: `Confirme sua presença na viagem para ${trip.destination}`,
          html: `
              <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6">
              <p>Você foi convidado para participar de uma viagem para ${trip.destination} nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
              <p></p>
              <p>Para confirmar sua viagem, clique no link abaixo:</p>
              <p>
              <a href="${confirmationLink}">Confirmar Viagem</a>
              </p>
              <p>Se você não pretende participar ou não sabe do que se trata, por favor, ignore este e-mail.</p>
            </div>
              `.trim(),
        });

        console.log(nodemailer.getTestMessageUrl(message));
      } catch (error) {
        throw new Error();
      }

      return {
        participantId: participant.id,
      };
    }
  );
}
