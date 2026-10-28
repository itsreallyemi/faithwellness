import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using FaithWellness to find, book and message a counselor.",
};

const mail = <a href={`mailto:${contactEmail}`}>{contactEmail}</a>;

export default function TermsPage() {
  return (
    <LegalPage
      overline="Terms"
      title="Terms of Service"
      intro={
        <p className="m-0">
          These terms cover your use of FaithWellness. By creating an account or booking a session, you agree to them.
          Please also read our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      }
      sections={[
        {
          title: "What FaithWellness is",
          body: (
            <>
              <p>
                FaithWellness is a place to find counselors and life coaches with faith-based accreditation, book video
                sessions and message them. The counselors are independent. They aren’t employed by FaithWellness, and
                each one is responsible for the care they give.
              </p>
              <p>
                Accreditation comes from each counselor’s church or denomination, not from FaithWellness. Some
                counselors also hold a state license, shown on their profile. Church accreditation isn’t a state license.
              </p>
            </>
          ),
        },
        {
          title: "Not for emergencies",
          body: (
            <p>
              FaithWellness isn’t an emergency service, and counselors may not see messages right away. If you or
              someone else is in danger, in the US call or text <a href="tel:988">988</a>, or call{" "}
              <a href="tel:911">911</a>.
            </p>
          ),
        },
        {
          title: "Your account",
          body: (
            <ul>
              <li>You must be 18 or older. A parent or guardian can book for a child under their own account.</li>
              <li>Use your own email address and keep access to it private. Sign-in links are sent there.</li>
              <li>Tell us if you think someone else has used your account.</li>
            </ul>
          ),
        },
        {
          title: "Booking, fees and cancelling",
          body: (
            <ul>
              <li>Each counselor sets their own fees. You see the fee before you confirm a booking.</li>
              <li>
                You can ask a counselor for a lower price if their fee is a hardship. They decide whether to accept.
              </li>
              <li>
                Church member care sessions are free to members, up to the number of sessions your church provides.
              </li>
              <li>
                You can cancel or reschedule from <Link href="/sessions">My sessions</Link>. Cancelling is free up to 24
                hours before a session. After that, your counselor may still ask for the fee.
              </li>
            </ul>
          ),
        },
        {
          title: "Using FaithWellness well",
          body: (
            <>
              <p>Please don’t:</p>
              <ul>
                <li>Harass, threaten or deceive a counselor, client or church.</li>
                <li>Record a session without everyone’s agreement.</li>
                <li>Pretend to be someone else, or try to get into accounts or data that aren’t yours.</li>
                <li>Use FaithWellness to advertise, or to contact counselors for anything other than care.</li>
              </ul>
              <p>We may suspend or close an account that breaks these terms.</p>
            </>
          ),
        },
        {
          title: "Counselors and churches",
          body: (
            <p>
              Counselors and church admins agree to keep the information in their profiles accurate, to keep their
              accreditation and any license current, and to keep client information confidential and use it only to
              provide care.
            </p>
          ),
        },
        {
          title: "Limits of our responsibility",
          body: (
            <p>
              We work to keep FaithWellness available and accurate, but we provide it as it is. We’re not responsible
              for the advice or care a counselor gives, and to the extent the law allows, we aren’t liable for indirect
              losses from using FaithWellness.
            </p>
          ),
        },
        {
          title: "Changes and contact",
          body: (
            <p>
              If we change these terms, we’ll update the date at the top, and tell you by email if the change is
              significant. Questions? Email {mail}.
            </p>
          ),
        },
      ]}
    />
  );
}
