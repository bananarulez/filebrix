/**
 * ============================================================================
 *  EDIT THIS FILE. Nothing else needs changing.
 * ============================================================================
 *
 * Every human-specific detail on the site — who runs it, which email address
 * receives what, which social profiles exist, when the legal pages last
 * changed — lives here and nowhere else. The About, Contact, Privacy and
 * Terms pages, the footer, the `Organization` structured data and
 * `/.well-known/security.txt` all read from this object, so changing an
 * address here changes it everywhere at once.
 *
 * The values shipped below are **placeholders**. They are deliberately
 * obvious (`example.com`, "Your Name") so nothing pretends to be real
 * identity information before you fill it in. `npm run test` includes a
 * launch-readiness check that lists every placeholder still in place — it
 * reports them rather than failing, so it's a checklist, not a blocker.
 *
 * Anything you don't have yet: set it to `null` rather than inventing a
 * value. Every consumer treats `null` as "don't show this at all", which is
 * always better than a dead link or an address that bounces.
 */

export interface SiteContactChannel {
  /** Address this reaches, or `null` to hide the channel entirely. */
  email: string | null;
  /** Shown to the user as "what belongs in this inbox". */
  description: string;
}

export const SITE_CONFIG = {
  /**
   * ---------------------------------------------------------------------
   * WHO RUNS THIS SITE
   * ---------------------------------------------------------------------
   * An identifiable operator is the single biggest trust signal for a tool
   * that asks people to open documents in it. It also feeds the
   * `Organization` structured data search engines use to connect the site
   * to a responsible party, and several EU jurisdictions expect it once a
   * site carries advertising.
   */
  operator: {
    /**
     * Display name, shown in the footer and on About.
     *
     * A team name rather than a personal one is a normal choice and needs no
     * company behind it. Be aware of what it costs, though: "who is
     * accountable for this site" is a real trust signal for a tool that asks
     * people to open documents in it, and a name with no person, entity or
     * public profile behind it is the weakest version of that answer. The
     * country below does some of that work; a registered entity would do the
     * rest, if this ever becomes commercially significant.
     */
    name: "FileBrix Team",
    /** Registered legal entity, if there is one. `null` for an individual or unregistered project. */
    legalName: null as string | null,
    /** Country you operate from. Shown on About; `null` hides it. */
    country: "Czechia" as string | null,
    /** Company/VAT registration number, if you have one. `null` hides it. */
    registrationNumber: null as string | null,
  },

  /**
   * ---------------------------------------------------------------------
   * CONTACT
   * ---------------------------------------------------------------------
   * Deliberately two channels, not eight. Splitting an inbox you don't have
   * volume for yet reads as corporate theatre and gives you more addresses
   * to monitor. Add more when the volume justifies it — the Contact page
   * renders whatever is listed here, and a channel with nothing behind it
   * hides itself.
   *
   * **Use addresses on your own domain, not a personal Gmail.** They're
   * forwardable, survive handing the project over, don't publish your
   * private address to scrapers, and a site asking to be trusted with
   * documents while listing a free webmail address undercuts itself. This
   * needs no mail *hosting*: Cloudflare and most registrars offer free email
   * routing that forwards `info@yourdomain` to the Gmail you already read,
   * and Gmail's "send as" lets you reply from it.
   *
   * These default to filebrix.com addresses. Flip `domainConfirmed` below
   * once they genuinely deliver — until then the launch checklist keeps
   * listing them, because a published address that bounces is worse than no
   * address at all.
   */
  contact: {
    general: {
      email: "info@filebrix.com",
      description:
        "Bug reports, feature requests, questions, feedback, business enquiries, advertising and partnerships. If you're not sure where something belongs, send it here.",
    } satisfies SiteContactChannel,

    security: {
      email: "security@filebrix.com",
      description:
        "Vulnerability reports. Please include steps to reproduce and don't test against other people's data. This address is also published at /.well-known/security.txt.",
    } satisfies SiteContactChannel,

    /**
     * Deliberately empty. With no public issue tracker there is nowhere for a
     * separate bug channel to point, and a second labelled inbox at the same
     * address is noise — bug reports are folded into `general` above instead.
     * `activeContactChannels()` hides this entirely while both its email and
     * `links.issues` are null; give it either to bring it back.
     */
    bugs: {
      email: null,
      description:
        "Bug reports and feature requests. Public issues are better than email: they're searchable, and someone else may have hit the same thing.",
    } satisfies SiteContactChannel,
  },

  /**
   * ---------------------------------------------------------------------
   * LINKS
   * ---------------------------------------------------------------------
   * `null` hides the link everywhere. `sameAs` in the structured data is
   * built from whatever is non-null here, which is how a search engine
   * ties this site to a known profile.
   *
   * **The repository is deliberately not published.** For an organic-search
   * business the code is a real head start for a copycat, while the moat is
   * domain authority and brand — publishing it gives away the reproducible
   * part and keeps none of the defensible part. The trust it would have
   * bought is available more cheaply: the Privacy page tells readers to open
   * their own DevTools Network tab, which proves "nothing is uploaded"
   * directly, rather than asking them to read source they would still have
   * to trust matches what is deployed.
   *
   * Setting `github` to a URL brings back every GitHub reference at once —
   * the footer link, the About and Privacy "check it yourself" paragraphs
   * and the Contact page's source section are all conditional on it.
   */
  links: {
    /** Repository root, if one is ever published. Also where a "report a bug" link would point. */
    github: "https://github.com/bananarulez/filebrix" as string | null,
    /** Issue tracker. `null` means bug reports go to the general email instead. */
    issues: null as string | null,
    x: null as string | null,
    mastodon: null as string | null,
    linkedin: null as string | null,
  },

  /**
   * ---------------------------------------------------------------------
   * LEGAL
   * ---------------------------------------------------------------------
   * `lastUpdated` is shown on the Privacy and Terms pages. Bump it whenever
   * you change either — an undated policy is a weaker signal than a dated
   * one, and some jurisdictions expect a visible effective date.
   *
   * ISO `YYYY-MM-DD`, so it renders the same in every locale.
   */
  legal: {
    lastUpdated: "2026-08-02",
    /** Governing law for the Terms. `null` omits the clause. */
    jurisdiction: "Czechia" as string | null,
  },

  /**
   * ---------------------------------------------------------------------
   * ADVERTISING
   * ---------------------------------------------------------------------
   * Drives what the Privacy page says about third parties, so it can't
   * drift from what the site actually does.
   *
   * - `"none"` — no ad network wired in. The Privacy page states that no
   *   third-party script runs at all, which is currently true (`AdSlot`
   *   only reserves layout space).
   * - `"contextual"` — a non-tracking, contextual network. The Privacy
   *   page says ads are shown but no personal data or cookies are used
   *   for them.
   * - `"personalized"` — a behavioural network such as AdSense. The
   *   Privacy page then discloses third-party cookies, **and you need a
   *   consent banner (CMP) for EEA/UK visitors before launching it.**
   *
   * Changing this to "personalized" also means loosening the CSP in
   * `next.config.ts` and updating the e2e privacy tests, which currently
   * assert zero off-origin requests. That is deliberate: the tests are
   * meant to notice when the privacy claim changes.
   */
  advertising: "none" as "none" | "contextual" | "personalized",

  /**
   * Flip to `true` once the contact addresses above actually deliver mail.
   *
   * Exists because the placeholder check cannot tell `info@filebrix.com`
   * from a working mailbox — an address only stops being a placeholder once
   * someone has sent a test message to it and received it. This is the one
   * thing in this file that cannot be verified by reading it.
   */
  domainConfirmed: true,
} as const;

/** Contact channels in display order, with the ones you haven't set up filtered out. */
export function activeContactChannels(): { key: string; label: string; channel: SiteContactChannel }[] {
  const { general, security, bugs } = SITE_CONFIG.contact;
  return [
    // The label names bugs too, because with no public tracker the `bugs`
    // channel below is empty and folded in here — a heading that omitted it
    // would send bug reporters looking for a channel that doesn't exist.
    { key: "general", label: "Bugs, questions, business & advertising", channel: general },
    { key: "bugs", label: "Bugs & feature requests", channel: bugs },
    { key: "security", label: "Security reports", channel: security },
  ].filter((entry) => entry.channel.email !== null || (entry.key === "bugs" && SITE_CONFIG.links.issues));
}

/** Every public profile URL that is actually set — used as `sameAs` in the Organization structured data. */
export function socialProfileUrls(): string[] {
  const { github, x, mastodon, linkedin } = SITE_CONFIG.links;
  return [github, x, mastodon, linkedin].filter((url): url is string => Boolean(url));
}

/**
 * Placeholder values still shipping, as human-readable strings.
 *
 * Exists so "did I remember to fill this in?" is a question the test suite
 * answers instead of one you have to re-audit by hand before launch. It
 * reports rather than fails, because placeholders are the correct state
 * during development.
 */
export function pendingSiteConfigPlaceholders(): string[] {
  const pending: string[] = [];
  // No `operator.name` check any more: it's set, and because this object is
  // `as const` TypeScript narrows the field to its literal type — so a
  // comparison against the old placeholder is provably dead code and fails
  // the build rather than quietly never firing. That's the type system doing
  // the job the check used to.
  for (const [key, channel] of Object.entries(SITE_CONFIG.contact)) {
    if (channel.email?.endsWith("@example.com")) pending.push(`contact.${key}.email is still an example.com address`);
  }
  for (const [key, url] of Object.entries(SITE_CONFIG.links)) {
    if (url?.includes("github.com/example/")) pending.push(`links.${key} still points at the placeholder repository`);
  }
  if (!SITE_CONFIG.domainConfirmed) {
    // Deliberately the last item to go green: everything else here can be
    // checked by reading the file, but "does this mailbox receive mail" can
    // only be checked by sending to it.
    pending.push(
      "domainConfirmed is false — send a test message to each contact address, then flip it once they arrive"
    );
  }
  return pending;
}
