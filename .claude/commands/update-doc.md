# Mise à jour automatique de la documentation

Analyse l'historique Git récent et *les modifications non commités* et met à jour les fichiers de documentation du projet.

## Instructions

### 1. Récupérer les commits récents et les modifications non commités
- Exécute `git log --oneline -30` pour récupérer les 30 derniers commits
- Exécute `git log --pretty=format:"%h - %s"` pour avoir plus de détails si nécessaire
- Exécute `git diff --name-only` pour identifier les fichiers modifiés non commités
- Exécute `git status --porcelain` pour voir l'état global des modifications en staging/unstaged

### 2. Analyser les modifications non commités
- Identifie les fichiers source modifiés (`src/`, `dist/`, etc.)
- Détermine quels fichiers de documentation pourraient être affectés
- Note les zones de travail actif pour adapter les recommandations de mise à jour
- **Exemple** : Si `src/lib/app.ts` est modifié, vérifie les références de ligne dans `CLAUDE.md`

### 3. Analyser l'historique existant
- Lit le fichier `doc/history.md` pour identifier les commits déjà documentés
- Compare les commits Git avec ceux listés dans l'historique
- Identifie les commits non documentés depuis la dernière mise à jour

### 4. Proposer une mise à jour
- Affiche les commits qui ne sont pas dans `doc/history.md`
- Présente la liste à l'utilisateur pour validation
- Si l'utilisateur valide, procède à la mise à jour

### 5. Mettre à jour `doc/history.md`
Pour chaque commit à ajouter :
- Extrait le sujet du commit (le plus clair et concis)
- Ajoute une nouvelle ligne en haut de la liste numérotée dans `doc/history.md`
- Réajuste la numérotation des entrées existantes (incrémente les numéros)
- **Format à respecter** : `N. <sujet du commit en français>`

**Exemple de mise à jour** :
Si `doc/history.md` commence par :
```
1. commit A
2. commit B
3. commit C
```

Et que tu ajoutes 2 nouveaux commits, il devient :
```
1. nouveau commit X
2. nouveau commit Y
3. commit A
4. commit B
5. commit C
```

### 6. Vérifier les références dans les fichiers affectés
- Pour les commits mentionnant "Ajouter", "Fixer", "Mettre à jour" ou "Refactorer" des fichiers source :
  - Lis les fichiers mentionnés dans le message de commit (ex: `src/lib/database.ts`)
  - Vérifie que les références de ligne dans `CLAUDE.md` et `AGENTS.md` sont toujours correctes
  - Si une ligne de référence a changé, mets à jour la documentation

**Exemple** :
- Si un commit dit "Fixer la vulnérabilité XSS à la ligne 62 de app.ts"
- Vérifie que `CLAUDE.md` ou `AGENTS.md` qui mention "ligne 62" correspond toujours

### 7. Mettre à jour les sections pertinentes
- **README.md** : Si le commit ajoute une nouvelle route, section ou fonctionnalité majeure
- **AGENTS.md** : Si le commit change l'architecture ou les conventions
- **CLAUDE.md** : Si le commit change la structure des fichiers source

Ne modifie que les sections directement affectées. Sois conservateur.

### 8. Valider les modifications
- Lis chaque fichier modifié pour vérifier la cohérence
- Vérifie que tous les liens Markdown sont valides (ex: `[file.ts](path/file.ts)`)
- S'assure que le style (français, impératif, etc.) est cohérent

### 9. Proposer un message de commit
- Compte le nombre de commits intégrés
- Propose un message du type : "Mettre à jour la documentation avec N commits"
- Affiche le nombre de fichiers modifiés et résume les changements

### 10. Ne pas commiter automatiquement
- Affiche un résumé des modifications
- Propose le message de commit mais ne le crée pas
- Laisse l'utilisateur décider s'il veut commiter (via la commande `/commit` s'il souhaite)

## Règles importantes

1. **Sécurité** :
   - Modifie uniquement les 4 fichiers de documentation : `README.md`, `CLAUDE.md`, `AGENTS.md`, `doc/history.md`
   - Demande confirmation avant toute modification
   - Ne touche pas aux fichiers source

2. **Qualité** :
   - Maintient le style français et impératif des messages
   - Préserve la numérotation cohérente dans `doc/history.md`
   - Valide tous les liens Markdown

3. **Intelligibilité** :
   - Affiche chaque étape clairement
   - Montre la liste des fichiers modifiés
   - Propose un message de commit approprié

## Cas spéciaux

- **Commits de merge** : Ignore les commits de merge (contiennent "Merge branch")
- **Commits doc-only** : Inclut-les mais note qu'ils ne changent pas le code source
- **Commits avec plusieurs sujets** : Extrait le sujet principal clairement

## Après exécution

Affiche :
```
✅ Documentation mise à jour

Fichiers modifiés :
- doc/history.md (ajouté X commits)
- README.md (sections mises à jour)
- AGENTS.md (sections mises à jour)

Commits intégrés :
1. <commit sujet>
2. <commit sujet>
...

Message de commit suggéré :
"Mettre à jour la documentation avec X commits"

Prochaine étape : Utilisez /commit pour créer le commit (ou git add et git commit manuellement)
```
