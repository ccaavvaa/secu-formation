Crée un commit git pour les changements actuels.

Paramètre optionnel : $ARGUMENTS (fichiers à commiter, séparés par des espaces)

Instructions :
1. Si $ARGUMENTS est fourni :
   - Trouve les noms exacts des fichiers et propose à l'utilisateur cette liste pour validation. Si l'utilisateur ne valide pas ne pas continuer.
   - Stage uniquement les fichiers spécifiés avec `git add <fichiers>`
   - Affiche les changements de ces fichiers avec `git diff --staged`
2. Sinon :
   - Exécute `git status` et `git diff --staged` pour voir les changements stagés
   - Si aucun changement n'est stagé, exécute cherche les changements non stagés et propose de les stager
3. Exécute `git log --oneline -5` pour voir le style des commits récents du projet
4. Analyse les changements et rédige un message de commit :
   - Sujet court et impératif en français (max 50 caractères)
   - Ligne vide
   - Corps explicatif si nécessaire (pourquoi, pas quoi)
   - **IMPORTANT** : JAMAIS mentionner 'Claude Code', 'claude code', ou 'Generated with Claude Code' dans le message
5. Propose le message de commit à l'utilisateur pour validation
6. Une fois validé, exécute le commit avec le message approuvé
