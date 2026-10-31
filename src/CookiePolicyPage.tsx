import React from 'react';
import LegalPageLayout from './components/LegalPageLayout';

import { EMAILS, SITE_DOMAIN } from './config/brand';
export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Politique de Cookies" lastUpdated="30 septembre 2026" canonicalPath="/cookie-policy">
      <section>
        <h2>1. Qu'est-ce qu'un cookie ?</h2>
        <p>
          Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, smartphone, tablette) lors
          de votre visite sur Lettrup. Il permet au site de mémoriser vos préférences et d'assurer le bon
          fonctionnement du service.
        </p>
      </section>

      <section>
        <h2>2. Cookies strictement nécessaires</h2>
        <p>
          Ces cookies sont indispensables au fonctionnement de Lettrup. Ils ne peuvent pas être désactivés.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em', marginTop: '0.75rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Nom</th>
              <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Fournisseur</th>
              <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Finalité</th>
              <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>sb-*-auth-token</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Supabase (Lettrup)</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Maintien de la session authentifiée</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Session / 7 jours</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>cvpilot_cookie_consent</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Lettrup</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Mémorise vos préférences de consentement aux cookies</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>13 mois</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>3. Cookies de mesure d'audience (avec votre consentement)</h2>
        <p>
          Ces cookies ne sont activés que si vous avez explicitement accepté leur dépôt via le bandeau de
          consentement. Ils nous aident à comprendre comment le site est utilisé afin de l'améliorer.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em', marginTop: '0.75rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Nom</th>
              <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Fournisseur</th>
              <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Finalité</th>
              <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>_analytics (à configurer)</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>À définir lors de l'activation</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>Mesure d'audience anonymisée</td>
              <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>13 mois maximum</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Gestion de vos préférences</h2>
        <p>
          Vous pouvez modifier ou retirer votre consentement à tout moment de deux façons :
        </p>
        <ul>
          <li>
            <strong>Via le bandeau cookies</strong> — cliquez sur le lien « Gérer les cookies » en bas de
            chaque page du site.
          </li>
          <li>
            <strong>Via votre navigateur</strong> — la plupart des navigateurs vous permettent de bloquer ou
            de supprimer les cookies. Consultez la documentation de votre navigateur (Chrome, Firefox, Safari,
            Edge) ou le guide de la{' '}
            <a
              href="https://www.cnil.fr/fr/cookies-et-autres-traceurs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tertiary hover:underline"
            >
              CNIL sur les cookies
            </a>
            .
          </li>
        </ul>
        <p className="mt-2">
          Le refus de cookies non essentiels n'affecte pas votre accès aux fonctionnalités de Lettrup.
        </p>
      </section>

      <section>
        <h2>5. Durée de conservation du consentement</h2>
        <p>
          Votre choix de consentement est mémorisé pendant 13 mois, conformément aux recommandations de la
          CNIL. À l'expiration de ce délai, nous vous demanderons à nouveau votre consentement.
        </p>
      </section>

      <section>
        <h2>6. Contact</h2>
        <p>
          Pour toute question relative aux cookies, contactez notre équipe à{' '}
          <a href={`mailto:${EMAILS.contact}`} className="text-tertiary hover:underline">{EMAILS.contact}</a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
