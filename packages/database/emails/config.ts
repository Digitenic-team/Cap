import { buildEnv, serverEnv } from "@cap/env";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import type { JSXElementConstructor, ReactElement } from "react";
import { Resend } from "resend";

export const resend = () =>
	serverEnv().RESEND_API_KEY ? new Resend(serverEnv().RESEND_API_KEY) : null;

export const smtpTransport = () => {
	const env = serverEnv();
	if (!env.SMTP_HOST) return null;
	return nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: env.SMTP_PORT ?? 587,
		secure: env.SMTP_SECURE,
		auth: env.SMTP_USER
			? { user: env.SMTP_USER, pass: env.SMTP_PASS }
			: undefined,
	});
};

export const sendEmail = async ({
	email,
	subject,
	react,
	marketing,
	test,
	scheduledAt,
	cc,
	replyTo,
	fromOverride,
}: {
	email: string;
	subject: string;
	react: ReactElement<unknown, string | JSXElementConstructor<unknown>>;
	marketing?: boolean;
	test?: boolean;
	scheduledAt?: string;
	cc?: string | string[];
	replyTo?: string;
	fromOverride?: string;
}) => {
	if (marketing && !buildEnv.NEXT_PUBLIC_IS_CAP) return;

	// Precedence: SMTP → Resend → no-op (dev-mode console fallback lives at call sites)
	const transport = smtpTransport();
	if (transport) {
		const from =
			fromOverride ?? serverEnv().SMTP_FROM ?? "Cap <no-reply@localhost>";
		const html = await render(react);
		return transport.sendMail({
			from,
			// SMTP has no equivalent of Resend's `delivered@resend.dev` sink, so `test`
			// sends to the real recipient; self-host callers are not expected to set `test`.
			to: email,
			subject,
			html,
			cc: test ? undefined : cc,
			replyTo,
			// `scheduledAt` is Resend-only; nodemailer has no scheduling, so it's ignored.
		});
	}

	const r = resend();
	if (!r) {
		return Promise.resolve();
	}

	let from: string;

	if (fromOverride) from = fromOverride;
	else if (marketing) from = "Richie from Cap <richie@send.cap.so>";
	else if (buildEnv.NEXT_PUBLIC_IS_CAP)
		from = "Cap Auth <no-reply@auth.cap.so>";
	else from = `auth@${serverEnv().RESEND_FROM_DOMAIN}`;

	return r.emails.send({
		from,
		to: test ? "delivered@resend.dev" : email,
		subject,
		react,
		scheduledAt,
		cc: test ? undefined : cc,
		replyTo: replyTo,
	});
};
