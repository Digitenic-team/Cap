import { z } from "zod";

export function isEmailAllowedForSignup(
	email: string,
	allowedDomainsConfig?: string,
	allowedEmailsConfig?: string,
): boolean {
	const hasDomainConfig =
		!!allowedDomainsConfig && allowedDomainsConfig.trim() !== "";
	const hasEmailConfig =
		!!allowedEmailsConfig && allowedEmailsConfig.trim() !== "";

	// If no restrictions are configured, allow all signups
	if (!hasDomainConfig && !hasEmailConfig) {
		return true;
	}

	const normalizedEmail = email.toLowerCase();

	// Exact email allowlist match
	if (
		hasEmailConfig &&
		parseAllowedEmails(allowedEmailsConfig as string).includes(normalizedEmail)
	) {
		return true;
	}

	// Domain allowlist match
	if (hasDomainConfig) {
		const emailDomain = extractDomainFromEmail(email);
		if (
			emailDomain &&
			parseAllowedDomains(allowedDomainsConfig as string).includes(
				emailDomain.toLowerCase(),
			)
		) {
			return true;
		}
	}

	return false;
}

function extractDomainFromEmail(email: string): string | null {
	// TODO: replace with zod v4's z.email()
	const emailValidation = z.string().email().safeParse(email);
	if (!emailValidation.success) {
		return null;
	}

	// Extract domain from validated email
	const atIndex = email.lastIndexOf("@");
	return atIndex !== -1 ? email.substring(atIndex + 1) : null;
}

function parseAllowedDomains(allowedDomainsConfig: string): string[] {
	return allowedDomainsConfig
		.split(",")
		.map((domain) => domain.trim().toLowerCase())
		.filter((domain) => domain.length > 0 && isValidDomain(domain));
}

function parseAllowedEmails(allowedEmailsConfig: string): string[] {
	return allowedEmailsConfig
		.split(",")
		.map((email) => email.trim().toLowerCase())
		.filter(
			(email) => email.length > 0 && z.string().email().safeParse(email).success,
		);
}

function isValidDomain(domain: string): boolean {
	// TODO: replace this polyfill with zod v4's z.hostname()
	const hostnameRegex =
		/^(?=.{1,253}$)(^((?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$|localhost)$/;
	return z
		.string()
		.refine((val) => hostnameRegex.test(val), {
			message: "Invalid hostname",
		})
		.safeParse(domain).success;
}
