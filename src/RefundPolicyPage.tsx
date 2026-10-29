import React from 'react';
import LegalPageLayout from './components/LegalPageLayout';

import { EMAILS, SITE_DOMAIN } from './config/brand';
export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Politique de Remboursement" lastUpdated="30 septembre 2026" canonicalPath="/refund">
      <section>
        <h2>1. Droit de rétractation (14 jours)</h2>
        <p>
          Conformément à l'article L. 221-18 du Code de la consommation, vous disposez d'un droit de
          rétractation de <strong>14 jours calendaires</strong> à compter de la date de souscription à un
          abonnement payant Lettrup, sans avoir à justifier de motifs ni à payer de pénalités.
        </p>
        <p className="mt-2">
          <strong>Renonciation au droit de rétractation :</strong> si vous demandez l'accès immédiat aux
          fonctionnalités de votre abonnement avant l'expiration de ce délai (ce qui est le cas par défaut sur
          Lettrup), vous reconnaissez expressément renoncer à votre droit de rétractation, conformément à
          l'article L. 221-28 du même code. Cette renonciation est recueillie lors de la finalisation de votre
          paiement.
        </p>
      </section>

      <section>
        <h2>2. Exercice du droit de rétractation</h2>
        <p>
          Pour exercer votre droit de rétractation — dans les 14 jours et avant d'avoir utilisé les
          fonctionnalités payantes — envoyez un e-mail à{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>{' '}
          en indiquant :
        </p>
        <ul>
          <li>Votre nom et adresse e-mail de compte</li>
          <li>La date de souscription</li>
          <li>La mention explicite de votre souhait de vous rétracter</li>
        </ul>
        <p className="mt-2">
          Nous accuserons réception de votre demande par e-mail et procéderons au remboursement dans un délai
          de <strong>14 jours</strong> à compter de la réception de la demande, via le même moyen de paiement
          que celui utilisé lors de la souscription.
        </p>
      </section>

      <section>
        <h2>3. Remboursements hors droit de rétractation</h2>
        <p>
          En dehors du droit de rétractation légal, les paiements déjà effectués ne donnent pas lieu à
          remboursement, notamment :
        </p>
        <ul>
          <li>En cas de résiliation en cours de période de facturation (mensuelle ou annuelle) — votre accès reste actif jusqu'à la fin de la période déjà réglée.</li>
          <li>En cas de non-utilisation partielle ou totale du service.</li>
          <li>Pour les achats de crédits supplémentaires ou packs à usage unique (1,99 €), qui sont non remboursables dès lors qu'ils ont été utilisés.</li>
        </ul>
      </section>

      <section>
        <h2>4. Erreur de facturation</h2>
        <p>
          Si vous constatez une erreur de facturation (double débit, montant incorrect), contactez-nous dans
          les 30 jours suivant la date du prélèvement à{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>{' '}
          avec votre reçu de paiement. Nous corrigerons l'erreur dans les meilleurs délais.
        </p>
      </section>

      <section>
        <h2>5. Résiliation d'abonnement</h2>
        <p>
          Vous pouvez résilier votre abonnement à tout moment depuis vos paramètres de compte, sans frais ni
          préavis. La résiliation prend effet à la fin de la période de facturation en cours. Vos données et
          documents restent accessibles jusqu'à cette date.
        </p>
      </section>

      <section>
        <h2>6. Contact</h2>
        <p>
          Pour toute question relative à la facturation ou aux remboursements :{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
