import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import dayjs from "dayjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";

import nodemailer from "nodemailer";

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips",
    {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          starts_at: z.coerce.date(),
          ends_at: z.coerce.date(),
          owner_name: z.string(),
          owner_email: z.string().email(),
          emails_to_invite: z.array(z.string().email()),
        }),
      },
    },
    async (request) => {
      const {
        destination,
        starts_at,
        ends_at,
        owner_name,
        owner_email,
        emails_to_invite,
      } = request.body;

      if (dayjs(starts_at).isBefore(new Date())) {
        throw new Error("Invalid start date");
      }

      if (dayjs(ends_at).isBefore(starts_at)) {
        throw new Error(
          "Invalid end Date. End date should be after start date."
        );
      }

      const trip = await prisma.trip.create({
        data: {
          destination,
          starts_at,
          ends_at,

          participants: {
            createMany: {
              data: [
                {
                  name: owner_name,
                  email: owner_email,
                  is_owner: true,
                  is_confirmed: true,
                },
                ...emails_to_invite.map((email) => {
                  return {
                    email,
                  };
                }),
              ],
            },
          },
        },
      });

      const mail = await getMailClient();

      const message = await mail.sendMail({
        from: {
          name: "Equipe planner",
          address: "oi@planner",
        },
        to: {
          name: owner_name,
          address: owner_email,
        },
        subject: "Teste de envio",
        html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6">
        <p>Você solicitou a criação de uma viagem para {destino} nas datas de {datas}.</p>
        <br/>
        <p>Para confirmar sua viagem, clique no link abaixo:</p>
        <br/>
        <p>
        <a href="">Confirmar Viagem</a>
        </p>
        <br/>
        <p>Caso esteja usando um dispositivo móvel, você também pode confirmar a criação da viagem pelos aplicativos:</p>
        <br/>
        <p>Aplicativo para iPhone</p>
        <p>Aplicativo para Android</p>
        <br/>
        <p>Se você não solicitou essa viagem, por favor, ignore este e-mail.</p>
      </div>
        `.trim(),
      });

      console.log(nodemailer.getTestMessageUrl(message));

      return {
        tripId: trip.id,
      };
    }
  );
}
