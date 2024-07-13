import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import { dayjs } from "../lib/dayjs";

import nodemailer from "nodemailer";

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/trips/:tripId/confirm",
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { tripId } = request.params;

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
        include: {
          participants: {
            where: {
              is_owner: false,
            },
          },
        },
      });

      if (!trip) {
        throw new Error("Trip not found");
      }

      if (trip.is_confirmed) {
        return reply.redirect(`http://localhost:3000/trips/${tripId}`);
      }

      await prisma.trip.update({
        where: {
          id: tripId,
        },
        data: { is_confirmed: true },
      });

      // const participants = await prisma.participant.findMany({
      //   where: {
      //     trip_id: tripId,
      //     is_owner: false
      //   }
      // })

      const formattedStartDate = dayjs(trip.starts_at).format("LL");
      const formattedEndDate = dayjs(trip.ends_at).format("LL");

      const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm/ID_DO_PARTICIPANTE`;

      const mail = await getMailClient();

      try {
        await Promise.all(
          trip.participants.map(async (participant) => {
            const message = await mail.sendMail({
              from: {
                name: "Equipe planner",
                address: "oi@planner",
              },
              to: participant.email,
              subject: `Confirme sua presença na viagem para ${trip.destination}`,
              html: `
              <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6">
              <p>Você foi convidado por ${
                trip?.participants?.find((participant) => participant.is_owner)
                  ?.name || "um amigo"
              } para participar de uma viagem para ${
                trip.destination
              } nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
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
          })
        );
      } catch (error) {
        throw new Error();
      }

      return reply.redirect(`http://localhost:3000/trips/${tripId}`);

      // return {
      //   tripdId: request.params.tripId,
      // };
    }
  );
}
