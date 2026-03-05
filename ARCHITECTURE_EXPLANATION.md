# Explication du flux de données et des variables

Ce document décrit de manière pédagogique où proviennent les données et comment les variables sont utilisées dans l'application LISTING.

## 1. Organisation générale

L'application se compose de deux parties distinctes :

1. **Frontend React** : interagit avec l'utilisateur, envoie des requêtes au backend et affiche les résultats.
2. **Backend Express + Supabase** : reçoit les requêtes, interroge la base de données PostgreSQL (via Supabase) et renvoie des réponses JSON.

Chaque côté manipule des types et des variables propres, mais ils partagent un contrat centralisé défini dans `src/types.ts`.

---

## 2. Types et schéma

- **Types partagés** (`Server`, `UserCollection`, etc.) se trouvent dans `types.ts`. Ils décrivent la forme des objets échangés entre frontend et backend.
- La **base de données** possède des tables correspondant aux types : `servers`, `users`, `server_collections`, etc.
- Les **migrations SQL** (`migrations.sql`) ajoutent des colonnes et des tables nécessaires aux nouvelles fonctionnalités (filtres avancés, collections, notifications, analytics, etc.).

---

## 3. Flux de données côté frontend

1. **Initialisation** : `App.tsx` charge les données de base (liste de serveurs, préférences utilisateur) en appelant des endpoints API comme `/api/servers`.
2. **State React** : les composants utilisent `useState` et `useEffect` pour stocker et rafraîchir les collections, filtres, comparaisons, etc.
3. **Interactions utilisateur** : lorsqu'un utilisateur applique un filtre, ajoute un serveur à une collection ou s'abonne aux notifications, un appel `fetch` est effectué vers le backend.
4. **Réponses JSON** : le backend renvoie des objets conformes aux types partagés, qui sont ensuite stockés dans l'état et passés en props.
5. **Animations** : `framer-motion` et `AnimatePresence` gèrent les transitions d'UI sans perturber la structure DOM.

Variables clés :
- `servers`, `filteredServers` : tableau principal des serveurs récupérés.
- `filters` : objet contenant `region`, `language`, `gameplay`, `tags` (listes de chaînes).
- `collections` : liste de `UserCollection` appartenant à l'utilisateur.
- `comparisonIds` : identifiants de serveurs à comparer.
- `analyticsData` : contenu des tableaux `hourly_analytics` pour les graphiques.

---

## 4. Flux de données côté backend

1. **Endpoints Express** : chaque fonctionnalité a une route dédiée (voir `API_ROUTES.ts`), par exemple :
   - `GET /api/servers` renvoie la liste avec possibilité de filtres.
   - `POST /api/collections` crée ou met à jour une collection.
   - `POST /api/notifications` gère les abonnements.
   - `PUT /api/analytics` reçoit des rapports horaires pour calculer des prédictions.
   - `POST /api/compare` enregistre un historique de comparaison.
2. **Appels Supabase** : le backend utilise le client Supabase pour envoyer des requêtes SQL préparées ou des appels RPC.
3. **WebSocket** : pour les push notifications, le serveur maintient une connexion WebSocket et envoie des messages lorsque des conditions sont détectées.
4. **Gestion d'état** : les variables internes sont temporaires (cache en mémoire) ; les informations persistantes sont stockées en base.

Variables importantes :
- `req.body` et `req.query` : paramètres envoyés par le frontend.
- `supabase.from('servers')` etc. : objets de requête pour interroger la base.
- `notificationSubscriptions` : table contenant les cfx_id associés aux utilisateurs.
- `hourly_analytics` : table utilisée pour calculer des moyennes et projections.

---

## 5. Exemple de parcours de données

1. L'utilisateur ouvre la page *Home*.
2. `App.tsx` déclenche `fetch('/api/servers')` avec éventuellement un objet `filters` en query.
3. Le backend reçoit la requête, carte les filtres sur une requête Supabase :
   ```ts
   let query = supabase.from('servers').select('*');
   if (filters.region.length) query = query.eq('region', filters.region[0]);
   if (filters.language.length) query = query.contains('language', filters.language);
   // ...
   ```
4. Le résultat renvoyé (table `Server` avec champs `region`, `tags`, etc.) est reçu par le frontend.
5. React stocke le tableau dans `servers` ; `AdvancedFilters` lit les métadonnées pour afficher les options.
6. Si l'utilisateur sauvegarde un serveur dans une collection, `fetch('/api/collections', { method: 'POST', body: JSON.stringify({ name, servers_ids }) })` est déclenché.
7. Le backend insère ou met à jour la table `server_collections` via Supabase.
8. À chaque étape, les variables locales (`newCollection`, `response`, `analyticsData`) sont de courte durée et disparaissent après l'opération.

---

## 6. Variables partagées et conventions

- Les chaînes `cfx_id` servent de **clé primaire** pour les serveurs et sont largement utilisées dans les relations.
- Les **tableaux texte** (`text[]`) sont utilisés pour les langues, gameplay, tags et listes d'IDs, ce qui simplifie les requêtes `contains`/`overlaps` en SQL.
- Les objets JSON envoyés au frontend sont *toujours* typés avec les interfaces de `types.ts` pour garantir une cohérence.
- Les noms des variables dans le code frontend suivent la notation camelCase (`serverList`, `filterOptions`), tandis que les colonnes de la base restent snake_case (`hour_of_day`).

---

## 7. Extraction dynamique des régions pour les filtres avancés

### 8.1. Problématique

La base de données Supabase peut stocker la région d'un serveur sous une forme générique (ex: `"EU"` pour Union Européenne). Cependant, chaque serveur possède une `locale` dans ses données FiveM (ex: `"ar-MA"` pour Maroc arabe) qui indique sa région **réelle**. 

Sans normalisation, le filtre **Advanced Filters** affichait "European Union" même pour des serveurs marocains, ce qui ne reflète pas la réalité et confond l'utilisateur.

### 8.2. Solution : Normalisation des régions

#### Frontend (Home.tsx)

La fonction `getAvailableRegions` extrait les régions réelles de tous les serveurs chargés :

```ts
const getAvailableRegions = React.useCallback((serversList: Server[]): string[] => {
  const regions = new Set<string>();
  serversList.forEach(server => {
    // Essayer d'obtenir la région depuis server.region et la normaliser
    if (server.region) {
      const code = regionCodeFromString(server.region, server.data?.vars?.locale);
      if (code) {
        regions.add(code);
      }
    }
    // Aussi vérifier la locale si disponible
    if (server.data?.vars?.locale) {
      const code = regionCodeFromString(undefined, server.data.vars.locale);
      if (code) {
        regions.add(code);
      }
    }
  });
  return Array.from(regions).sort();
}, []);
```

**Comment ça fonctionne :**
1. Pour chaque serveur, on appelle `regionCodeFromString()` avec à la fois la `region` et la `locale`.
2. Cette fonction retourne un **code pays ISO 3166-1 alpha-2** (ex: `"MA"`, `"FR"`, `"US"`).
3. Les codes sont collectés dans un `Set` pour éliminer les doublons.
4. Le résultat est un tableau trié de codes pays **réels** présents dans la base.

#### Utilitaire de normalisation (lib/utils.ts)

La fonction `regionCodeFromString()` extrait un code pays valide de deux sources :

```ts
export function regionCodeFromString(region?: string, locale?: string): string | null {
  let code: string | null = null;
  
  // Extraire le code de la région si présente (ex: "EU" → "EU", "MA" → "MA")
  if (region) {
    const match = region.trim().toUpperCase().match(/[A-Z]{2}/);
    if (match) code = match[0];
  }
  
  // Si région est générique (EU) ou absente, préférer la locale
  if (locale) {
    const parts = locale.split(/[-_]/);
    let locCode: string | null = null;
    
    // Extraire le code pays de la locale (ex: "ar-MA" → "MA", "en-US" → "US")
    if (parts.length > 1 && /^[a-zA-Z]{2}$/.test(parts[1])) {
      locCode = parts[1].toUpperCase();
    } else if (/^[a-zA-Z]{2}$/.test(parts[0])) {
      locCode = parts[0].toUpperCase();
    }
    
    // Préférer la locale si région est manquante ou générique
    if (locCode && (!code || code === 'EU') && locCode !== code) {
      code = locCode;
    }
  }
  
  return code;
}
```

**Exemple :** 
- Serveur avec `region: "EU"` et `locale: "ar-MA"` → retourne `"MA"` ✓
- Serveur avec `region: "US"` → retourne `"US"` ✓
- Serveur avec `locale: "fr-FR"` → retourne `"FR"` ✓

#### Composant AdvancedFilters

Le composant reçoit `availableRegions` et ne bâtit le filtre de pays qu'avec les régions réellement présentes :

```ts
const regionsToDisplay = React.useMemo(() => {
  if (availableRegions && availableRegions.length > 0) {
    // Transformer codes ISO en noms de pays lisibles
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return availableRegions
      .map(code => ({ code, name: names.of(code) || code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  // Retomber sur tous les pays si aucun n'est détecté
  return COUNTRIES;
}, [availableRegions]);
```

### 8.3. Flux complet

1. **Chargement des serveurs** (`Home.tsx`)
   - Appel `fetch('/api/servers')`
   - Serveurs reçus avec `region` et `data.vars.locale`

2. **Extraction des régions** 
   - `getAvailableRegions()` parcourt tous les serveurs
   - `regionCodeFromString()` normalise chaque région
   - Résultat: `["MA", "FR", "US"]`

3. **Passage au filtre**
   - `availableRegions` est passé à `AdvancedFilters`
   - Le filtre affiche uniquement les pays récupérés

4. **Affichage utilisateur**
   - Au lieu de voir "European Union" pour tous les serveurs
   - L'utilisateur voit les vraies régions : "Morocco", "France", "United States"

### 8.4. Avantages

✓ Filtres **réalistes** : l'utilisateur voit uniquement les pays présents dans les données
✓ Pas d'options **vides** : pas de boutons pays inutiles
✓ **Précision** : extraction depuis la locale quand région est générique
✓ **Scalabilité** : ajouter un serveur Égyptien ajoute automatiquement l'Égypte au filtre

---

## 9. Conclusion

Ce modèle sépare clairement responsabilités : le frontend se préoccupe de l'affichage et de l'état local, le backend s'occupe de la logique métier et de la persistance. Les types partagés et la structure des migrations assurent une communication fiable entre les deux côtés. En comprenant ces flux et variables, tout développeur peut ajouter de nouvelles fonctionnalités sans perturber l'architecture existante.