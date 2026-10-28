import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What FaithWellness collects, why, who it’s shared with and the choices you have.",
};

const mail = <a href={`mailto:${contactEmail}`}>{contactEmail}</a>;

export default function PrivacyPage() {
  return (
    <LegalPage
      overline="Privacy"
      title="Privacy Policy"
      intro={
        <>
          <p className="m-0">
            Counseling is personal. This policy explains what FaithWellness collects, why we need it, who we share it
            with and the choices you have. We keep it to what we need to connect you with a counselor and run your
            sessions.
          </p>
          <p className="m-0">
            FaithWellness connects people with counselors and life coaches. Each counselor is responsible for the
            counseling itself, including their own session notes and any records their license or church requires.
          </p>
        </>
      }
      sections={[
        {
          title: "What we collect",
          body: (
            <>
              <p>
                <b>From you, when you sign in or use FaithWellness:</b>
              </p>
              <ul>
                <li>Your email address and the name you’d like to go by.</li>
                <li>Your time zone, so session times show correctly.</li>
                <li>
                  Your answers to the short “find a counselor” questions, such as who the counseling is for, the topics
                  you’d like help with, your language and denomination. You choose whether your counselor sees them.
                </li>
                <li>Your bookings, price requests, insurance details you enter, and church membership details.</li>
                <li>Messages you send to your counselor, and theirs to you.</li>
              </ul>
              <p>
                <b>If you sign in with Google:</b> your name, email address and profile picture from your Google
                account. We don’t see your Google password.
              </p>
              <p>
                <b>Automatically:</b> basic technical information your browser sends, such as your IP address, device
                type and pages visited, which our hosting provider uses to keep the site running and secure.
              </p>
            </>
          ),
        },
        {
          title: "Counselors and Google Calendar",
          body: (
            <>
              <p>
                Counselors can connect their Google Calendar so clients only see times they are free. With their
                permission, FaithWellness reads when the counselor is busy (not what their other events are about) and
                adds each booked session, with its video link and a 15-minute rest block, to their calendar.
              </p>
              <p>
                Calendar events we create are titled “FaithWellness session”. We never put a client’s name or the
                topic of a session in a calendar event.
              </p>
              <p>
                FaithWellness’s use and transfer of information received from Google APIs follows the{" "}
                <a href="https://developers.google.com/terms/api-services-user-data-policy">
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. We use Google data only to provide these booking features. We
                don’t sell it, use it for advertising or use it to train AI models, and people at FaithWellness can’t
                read it except when the counselor asks us to, for security, or when the law requires it.
              </p>
            </>
          ),
        },
        {
          title: "How we use it",
          body: (
            <ul>
              <li>To sign you in and keep your account secure.</li>
              <li>To suggest counselors who fit what you shared.</li>
              <li>To book, change and remind you about sessions, and to deliver messages.</li>
              <li>To apply church membership benefits and price requests you make.</li>
              <li>To answer you when you contact us, and to prevent fraud and misuse.</li>
            </ul>
          ),
        },
        {
          title: "Who can see it",
          body: (
            <>
              <ul>
                <li>
                  <b>Your counselor</b> sees your name, your bookings, your messages and, if you allow it, your answers
                  to the questions.
                </li>
                <li>
                  <b>Your church</b>, if you use church member care, sees your name and that you’ve joined as a
                  member, so it can approve you. It sees only session totals for the whole church, never who booked,
                  when, which counselor or anything said in a session or message.
                </li>
                <li>
                  <b>Companies that run parts of FaithWellness for us</b>, only to provide their service: Supabase
                  (database and sign-in), Vercel (website hosting), Google (sign-in, calendar and video links), an email
                  provider for sign-in links and reminders, and a payment processor once payments are added.
                </li>
              </ul>
              <p>
                We don’t sell your information and don’t share it for advertising. We share it otherwise only if the
                law requires it, or to protect someone’s safety.
              </p>
            </>
          ),
        },
        {
          title: "How long we keep it",
          body: (
            <p>
              We keep your account information while your account is open. When you delete your account, we delete your
              profile and sign-in details straight away and remove the rest within 30 days, except anything we must
              keep by law.
            </p>
          ),
        },
        {
          title: "Your choices",
          body: (
            <ul>
              <li>
                Change your name, email or time zone, or delete your account, on your{" "}
                <Link href="/account">Account</Link> page.
              </li>
              <li>Retake or edit the counselor questions at any time, and choose whether your counselor sees them.</li>
              <li>
                Ask for a copy of your information, or ask us to correct or delete it, by emailing {mail}.
              </li>
              <li>
                Counselors can disconnect Google Calendar in their settings, or remove FaithWellness’s access from their
                Google account at any time.
              </li>
            </ul>
          ),
        },
        {
          title: "Security",
          body: (
            <p>
              Your information is stored with access rules that let each person see only their own account, bookings
              and messages. Connections to FaithWellness are encrypted. No system is perfectly secure, so if we ever
              learn of a breach that affects you, we’ll tell you.
            </p>
          ),
        },
        {
          title: "Children",
          body: (
            <p>
              You must be 18 or older to create an account. A parent or guardian can book counseling for a child under
              their own account.
            </p>
          ),
        },
        {
          title: "Changes and contact",
          body: (
            <p>
              If we change this policy, we’ll update the date at the top, and tell you by email if the change is
              significant. Questions? Email {mail}.
            </p>
          ),
        },
      ]}
    />
  );
}
