import React from 'react';
import LegalPageLayout from './components/LegalPageLayout';

import { EMAILS, SITE_DOMAIN } from './config/brand';
export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Politique de Confidentialité" lastUpdated="11 août 2026" canonicalPath="/privacy">
      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Lettrup ("nous", "notre", "la plateforme"), service édité par Linker Automation Tech
          (micro-entreprise française), est responsable du traitement des données
          personnelles collectées via le site et l'application {SITE_DOMAIN}. Pour toute question relative
          à vos données personnelles, vous pouvez nous contacter à l'adresse{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>
          .
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>Selon votre usage de la plateforme, nous collectons :</p>
        <ul>
          <li>Données de compte : nom, adresse e-mail, mot de passe (stocké de façon chiffrée).</li>
          <li>Données de profil Candidat : CV, lettres de motivation, expérience, compétences, objectifs de carrière.</li>
          <li>Données de profil Recruteur : nom de l'entreprise, numéro SIREN/SIRET, site web, intitulé de poste.</li>
          <li>Données d'usage : pages consultées, actions effectuées, journaux techniques (adresse IP, navigateur).</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités du traitement</h2>
        <ul>
          <li>Créer et sécuriser votre compte et votre espace personnel (Candidat, Recruteur ou Administrateur).</li>
          <li>Fournir les fonctionnalités du service : création de CV, scan ATS, simulateur d'entretien, matching offres/candidats.</li>
          <li>Assurer la sécurité de la plateforme et prévenir les fraudes ou usages abusifs.</li>
          <li>Vous contacter au sujet de votre compte ou, si vous y avez consenti, à des fins d'information et de newsletter.</li>
        </ul>
      </section>

      <section>
        <h2>4. Base légale</h2>
        <p>
          Les traitements décrits ci-dessus reposent sur l'exécution du contrat qui nous lie à vous (fourniture
          du service demandé), sur votre consentement (newsletter, cookies non essentiels) et sur notre intérêt
          légitime à sécuriser et améliorer la plateforme.
        </p>
      </section>

      <section>
        <h2>5. Durée de conservation</h2>
        <p>
          Vos données sont conservées pendant toute la durée de votre compte, puis supprimées ou anonymisées
          dans un délai raisonnable après sa clôture, sauf obligation légale de conservation plus longue.
        </p>
      </section>

      <section>
        <h2>6. Vos droits</h2>
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
        <ul>
          <li>Droit d'accès et de rectification de vos données.</li>
          <li>Droit à l'effacement ("droit à l'oubli").</li>
          <li>Droit à la portabilité de vos données.</li>
          <li>Droit d'opposition et de limitation du traitement.</li>
          <li>Droit de retirer votre consentement à tout moment, lorsque le traitement en repose.</li>
        </ul>
        <p className="mt-2">
          Pour exercer ces droits, contactez-nous à{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>
          . Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </p>
      </section>

      <section>
        <h2>7. Hébergement et sécurité</h2>
        <p>
          Votre base de données de compte est hébergée au sein de l'Union Européenne. L'accès à votre compte est
          protégé par chiffrement, et l'attribution des rôles (Candidat, Recruteur, Administrateur) est strictement
          contrôlée côté serveur : aucun compte ne peut s'attribuer lui-même des droits d'administration.
        </p>
      </section>

      <section>
        <h2>8. Sous-traitants et transferts de données hors UE</h2>
        <p>
          Pour fournir certaines fonctionnalités, nous faisons appel aux sous-traitants suivants, qui peuvent
          traiter tout ou partie de vos données personnelles en dehors de l'Union Européenne (notamment aux
          États-Unis) :
        </p>
        <ul>
          <li>
            <strong>Fournisseurs de modèles d'IA (via OpenRouter)</strong> — traitement du contenu de votre CV et de
            vos lettres de motivation pour générer des adaptations, scans ATS et suggestions personnalisées.
          </li>
          <li>
            <strong>Resend</strong> — envoi des e-mails transactionnels (confirmation de compte, réinitialisation de
            mot de passe, notifications).
          </li>
          <li>
            <strong>Stripe</strong> — traitement des paiements et de la facturation des abonnements.
          </li>
          <li>
            <strong>Upstash</strong> — limitation de débit technique pour protéger le service contre les abus (aucune
            donnée de profil n'est transmise, seule une adresse IP est traitée temporairement).
          </li>
          <li>
            <strong>Supabase</strong> — hébergement de la base de données et authentification des comptes (données
            de compte, de profil candidat et recruteur). Les données sont hébergées dans l'Union Européenne (région
            West Europe).
          </li>
        </ul>
        <p className="mt-2">
          Chacun de ces transferts hors UE est encadré par des clauses contractuelles types (CCT/SCC) adoptées par
          la Commission européenne, ou par un mécanisme d'adéquation équivalent, conformément à l'article 46 du
          RGPD. Vous pouvez demander la liste détaillée de nos sous-traitants et des garanties associées à{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>
          .
        </p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p>
          Nous utilisons deux catégories de cookies :
        </p>
        <ul>
          <li>
            <strong>Cookies strictement nécessaires</strong> — indispensables au fonctionnement de Lettrup
            (maintien de session, préférences de connexion, sécurité CSRF). Ces cookies ne peuvent pas être
            désactivés. Durée de conservation : durée de la session ou 30 jours pour le cookie de session
            authentifiée.
          </li>
          <li>
            <strong>Cookies analytiques (avec consentement)</strong> — utilisés pour mesurer l'audience et
            améliorer le service. Ces cookies ne sont activés que si vous y consentez explicitement via le
            bandeau de consentement qui s'affiche lors de votre première visite. Durée : 13 mois maximum
            conformément aux recommandations de la CNIL.
          </li>
        </ul>
        <p className="mt-2">
          Vous pouvez modifier vos préférences à tout moment depuis le lien « Gérer les cookies » en bas de
          page, ou en effaçant les cookies de votre navigateur. Pour l'inventaire complet des cookies utilisés,
          consultez notre{' '}
          <a href="/cookie-policy" className="text-tertiary hover:underline">
            Politique de Cookies
          </a>
          {' '}ou le{' '}
          <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs" target="_blank" rel="noopener noreferrer" className="text-tertiary hover:underline">
            guide de la CNIL
          </a>
          .
        </p>
      </section>

      <section>
        <h2>10. Modifications</h2>
        <p>
          Cette politique peut être mise à jour pour refléter des évolutions légales ou fonctionnelles. La date de
          dernière mise à jour figure en haut de cette page.
        </p>
      </section>
    </LegalPageLayout>
  );
}
