import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';

// --- Définition des Variables CSS (Tokens de la charte) pour une application en ligne ---
// En production, ces variables seraient définies dans un fichier CSS global ou un composant <style>
const designTokens = {
  colorPrimary: '#003366', // Bleu Nuit
  colorAccent: '#28A6BF', // Turquoise
  colorSurface: '#F8FAFC', // Gris Ardoise (pour les fonds légers)
  colorWhite: '#FFFFFF',
  colorTextMain: '#003366',
  fontHeading: 'Montserrat, sans-serif',
  fontBody: 'Inter, sans-serif',
  buttonRadius: '4px',
  inputRadius: '4px',
  // Couleurs sémantiques ajoutées pour le feedback
  colorError: '#D32F2F', // Un rouge standard
  colorInfo: '#003366', // Bleu Nuit pour les notes d'information
};

// Styles basés sur les spécifications UI
const styles = {
  // Styles généraux de la page/section
  pageSection: {
    maxWidth: '400px',
    margin: '3rem auto',
    padding: '2rem',
    backgroundColor: designTokens.colorWhite,
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 51, 102, 0.1)', // Ombre légère Bleu Nuit
  },
  
  // Titres H2
  h2: {
    fontFamily: designTokens.fontHeading,
    fontWeight: '600',
    color: designTokens.colorWhite,
    borderBottom: `2px solid ${designTokens.colorAccent}`,
    paddingBottom: '0.5rem',
    marginBottom: '1.5rem',
  },

  // Formulaire et Labels
  label: {
    display: 'block',
    fontFamily: designTokens.fontBody,
    fontWeight: '500', // Medium
    color: designTokens.colorPrimary,
    marginBottom: '0.4rem',
    marginTop: '1rem',
    fontSize: '14px',
  },

  // Inputs
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${designTokens.colorPrimary}40`, // 40% opacité
    borderRadius: designTokens.inputRadius,
    fontFamily: designTokens.fontBody,
    fontSize: '16px',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box', // Assure que padding et border sont inclus dans la largeur
  },
  
  // Input: Focus state (doit être géré via CSS ou un composant stylisé)
  inputFocus: {
    borderColor: designTokens.colorAccent,
    boxShadow: `0 0 0 2px ${designTokens.colorAccent}40`,
  },

  // Bouton Primaire (Se connecter)
  buttonPrimary: {
    // Style du bouton Primaire (Connexion)
    backgroundColor: designTokens.colorPrimary,
    color: designTokens.colorWhite,
    fontFamily: designTokens.fontBody,
    fontWeight: '500', // Medium
    fontSize: '16px',
    padding: '12px 24px',
    border: 'none',
    borderRadius: designTokens.buttonRadius,
    cursor: 'pointer',
    marginTop: '1.5rem',
    width: '100%',
    transition: 'background-color 0.3s',
  },
  
  // Texte d'erreur
  errorText: {
    color: designTokens.colorError,
    fontFamily: designTokens.fontBody,
    fontWeight: '500',
    marginTop: '1rem',
    borderLeft: `4px solid ${designTokens.colorError}`,
    paddingLeft: '10px',
  },
  
  // Note d'information (Suggestion)
  infoNote: {
    // Note d'information : Style par défaut pour les messages systèmes.
    fontFamily: designTokens.fontBody,
    fontSize: '0.9em',
    color: designTokens.colorTextMain, // Texte Bleu Nuit
    marginTop: '1.5rem',
    padding: '10px',
    backgroundColor: designTokens.colorSurface, // Fond Gris Ardoise
    borderLeft: `4px solid ${designTokens.colorInfo}`, // Barre Bleu Nuit
    borderRadius: '0 4px 4px 0',
  }
};
// --- Fin des Tokens et Styles ---


export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [redirectedFrom, setRedirectedFrom] = useState('');
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  useEffect(() => {
    if (router.query.redirectedFrom) {
      setRedirectedFrom(router.query.redirectedFrom);
    }
  }, [router.query]);


  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const body = {
      username: event.currentTarget.username.value,
      password: event.currentTarget.password.value,
    };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Redirect to the page they came from, or home page if none
        router.push(redirectedFrom || '/');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Échec de la connexion. Veuillez vérifier vos identifiants.');
      }
    } catch (error) {
      console.error('An unexpected error occurred:', error);
      setError('Une erreur inattendue s\'est produite lors de la tentative de connexion.');
    }
  }

  return (
    <>
      <Head>
        <title>Connexion - Cartographie des Hôpitaux Publics de Corse</title>
        <meta charSet="UTF-8" />
        {/* Inclusion des polices via Head (alternative au CSS global) */}
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Le Header utilise vos classes CSS existantes (hero, page-shell, hero-grid, etc.)
        J'ai ajouté des styles inline pour assurer la typographie et la couleur du texte.
      */}
      <header className="hero" style={{ backgroundColor: designTokens.colorSurface, padding: '2rem 0' }}>
        <div className="page-shell hero-grid">
          <div className="hero-brand" style={{ gridColumn: '1 / -1', fontFamily: designTokens.fontBody }}>
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" style={{ maxHeight: '60px' }} />
            </div>
            <div style={{ marginLeft: '1rem' }}>
              <p className="eyebrow" style={{ color: designTokens.colorPrimary, fontWeight: '500', fontSize: '14px' }}>
                GCS E-santé Corse
              </p>
              <motion.h1 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5 }}
                style={{ fontFamily: designTokens.fontHeading, fontWeight: '700', color: designTokens.colorWhite, fontSize: '28px' }}
              >
                Authentification Requise
              </motion.h1>
              <p className="hero-subtitle" style={{ color: designTokens.colorWhite, opacity: 0.8, marginTop: '0.5rem' }}>
                Veuillez vous connecter pour accéder à l'application.
              </p>
            </div>
          </div>
        </div>
      </header>
      
      <section className="page-shell" style={styles.pageSection}>
        <h2 style={styles.h2}>Se connecter</h2>
        
        <form onSubmit={handleSubmit}>
          
          <label htmlFor="username" style={styles.label}>Nom d'utilisateur (Identifiant GCS)</label>
          <input 
            type="text" 
            id="username" 
            name="username" 
            required 
            style={{ 
              ...styles.input, 
              ...(isUsernameFocused ? styles.inputFocus : {}), // Application du style focus
            }}
            onFocus={() => setIsUsernameFocused(true)}
            onBlur={() => setIsUsernameFocused(false)}
          />
          
          <label htmlFor="password" style={styles.label}>Mot de passe</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            required 
            style={{ 
              ...styles.input, 
              ...(isPasswordFocused ? styles.inputFocus : {}), // Application du style focus
            }}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
          />
          
          {/* Message d'erreur formaté selon la charte */}
          {error && <p style={styles.errorText}>{error}</p>}
          
          {/* Note d'information formatée selon la charte */}
          <p style={styles.infoNote}>
            Le mot de passe vous attend sagement dans votre coffre-fort habituel sous le mot-clé CARTOGRAPHIE-SI 💡
          </p>

          {/* Bouton Primaire formaté selon la charte */}
          <button type="submit" style={styles.buttonPrimary}>
            Se connecter
          </button>
        </form>
      </section>
    </>
  );
}