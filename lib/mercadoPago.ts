import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: .env.MP_ACCESS_TOKEN });

const payment = new Payment(client);
payment.create({ body: req.body })
.then(console.log)
.catch(console.log);
