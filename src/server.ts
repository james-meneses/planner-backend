import fastify from "fastify";
import cors from "@fastify/cors";
import { createTrip } from "./routes/create-trip";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { confirmTrip } from "./routes/confirm-trip";
import { confirmParticipants } from "./routes/confirm-participants";

const app = fastify();

app.register(cors, {
  origin: "*",
});

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(createTrip);
app.register(confirmTrip);
app.register(confirmParticipants);

app.listen({ port: 3333 }).then(() => {
  console.log("server running");
});
