import React from 'react';
import LegalPageLayout from './components/LegalPageLayout';

import { EMAILS, SITE_DOMAIN } from './config/brand';
export default function TermsPage() {
  return (
    <LegalPageLayout title="Conditions Générales d'Utilisation" lastUpdated="1er août 2026" canonicalPath="/terms">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation ("CGU") régissent l'accès et l'utilisation de la
          plateforme {SITE_DOMAIN}, éditée par Linker Automation Tech (micro-entreprise française), incluant l'espace Candidat, l'espace Recruteur / RH et le panneau
          d'Administration. En créant un compte, vous acceptez les présentes CGU.
        </p>
      </section>

      <section>
        <h2>2. Création de compte et rôles</h2>
        <p>
          Chaque compte est associé à un rôle unique déterminant l'espace auquel vous accédez :
        </p>
        <ul>
          <li><strong>Candidat</strong> : création de CV, lettres de motivation, simulateur d'entretien, suivi de candidatures.</li>
          <li><strong>Recruteur / RH</strong> : publication d'offres, recherche et mise en relation avec des candidats.</li>
          <li><strong>Administrateur</strong> : supervision de la plateforme. Ce rôle n'est jamais accessible par inscription et ne peut être attribué que par l'équipe Lettrup.</li>
        </ul>
        <p className="mt-2">
          Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis
          votre compte.
        </p>
      </section>

      <section>
        <h2>3. Exactitude des informations</h2>
        <p>
          Vous vous engagez à fournir des informations exactes lors de votre inscription, notamment votre nom,
          votre adresse e-mail et, pour un compte Recruteur, les informations légales de votre entreprise
          (numéro SIREN/SIRET, nom, site web).
        </p>
      </section>

      <section>
        <h2>4. Usage autorisé</h2>
        <p>Vous vous engagez à ne pas :</p>
        <ul>
          <li>Usurper l'identité d'un tiers ou fournir des informations d'entreprise frauduleuses.</li>
          <li>Tenter de contourner les mécanismes de sécurité ou de contrôle d'accès de la plateforme.</li>
          <li>Publier des offres d'emploi trompeuses, illégales ou discriminatoires.</li>
          <li>Utiliser la plateforme à des fins autres que la recherche d'emploi ou le recrutement.</li>
        </ul>
      </section>

      <section>
        <h2>5. Propriété intellectuelle</h2>
        <p>
          Les contenus que vous créez (CV, lettres, portfolios) restent votre propriété. Lettrup conserve
          l'ensemble des droits sur la plateforme, ses modèles, ses algorithmes et son contenu éditorial.
        </p>
      </section>

      <section>
        <h2>6. Résiliation</h2>
        <p>
          Vous pouvez supprimer votre compte à tout moment depuis vos paramètres. Lettrup se réserve le droit
          de suspendre ou résilier un compte en cas de violation des présentes CGU.
        </p>
      </section>

      <section>
        <h2>7. Limitation de responsabilité</h2>
        <p>
          Lettrup fournit des outils d'aide à la candidature et au recrutement (dont certains assistés par IA)
          sans garantir un résultat (obtention d'un poste, recrutement d'un candidat). Le service est fourni
          "en l'état".
        </p>
      </section>

      <section>
        <h2>8. Abonnements, facturation et remboursements</h2>
        <p>
          Les offres payantes de Lettrup (mensuelle ou annuelle) sont souscrites par tacite reconduction. Vous
          pouvez résilier votre abonnement à tout moment depuis vos paramètres ; la résiliation prend effet à la
          fin de la période de facturation en cours.
        </p>
        <p className="mt-2">
          <strong>Droit de rétractation.</strong> Conformément à l'article L. 221-18 du Code de la consommation,
          vous disposez d'un droit de rétractation de 14 jours à compter de la souscription. Si vous demandez
          l'accès immédiat aux fonctionnalités de votre abonnement avant l'expiration de ce délai, vous reconnaissez
          expressément renoncer à votre droit de rétractation conformément à l'article L. 221-28 du même code.
          Pour exercer ce droit, contactez{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>.
        </p>
        <p className="mt-2">
          En dehors du droit de rétractation ci-dessus, les paiements déjà effectués ne sont pas remboursables, sauf
          obligation légale contraire. Pour plus de détails, consultez notre{' '}
          <a href="/refund" className="text-tertiary hover:underline">Politique de Remboursement</a>.
          Pour toute réclamation de facturation, écrivez à{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>.
        </p>
      </section>

      <section>
        <h2>9. Droit applicable</h2>
        <p>
          Les présentes CGU sont soumises au droit français. Pour toute question, contactez{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
