# Orbis Fidei

> **L'actualité religieuse dans le monde**

Orbis Fidei est un portail international d'actualités religieuses, disponible en français, anglais et russe.

Le projet vise à agréger automatiquement des informations provenant de médias chrétiens du monde entier, à les soumettre à une équipe de modération, puis à publier des contenus vérifiés et édités dans les trois langues du portail.

L'automatisation intervient dans la collecte, l'analyse et la traduction, mais la publication reste sous contrôle humain.

## Table des matières

1. [Objectifs](#1-objectifs)
2. [Fonctionnement général](#2-fonctionnement-général)
3. [Interface publique](#3-interface-publique)
4. [Langues](#4-langues)
5. [Sources et agrégation](#5-sources-et-agrégation)
6. [Agents automatisés](#6-agents-automatisés)
7. [Modération](#7-modération)
8. [Workflow éditorial](#8-workflow-éditorial)
9. [Gestion des utilisateurs et des droits](#9-gestion-des-utilisateurs-et-des-droits)
10. [Discussions](#10-discussions)
11. [Recherche et filtrage](#11-recherche-et-filtrage)
12. [Catégorisation](#12-catégorisation)
13. [Architecture technique](#13-architecture-technique)
14. [Base de données](#14-base-de-données)
15. [Tâches asynchrones](#15-tâches-asynchrones)
16. [Authentification et sécurité](#16-authentification-et-sécurité)
17. [Historique et traçabilité](#17-historique-et-traçabilité)
18. [Principes éditoriaux et techniques](#18-principes-éditoriaux-et-techniques)
19. [Structure envisagée du dépôt](#19-structure-envisagée-du-dépôt)
20. [MVP](#20-mvp)
21. [Évolutions futures](#21-évolutions-futures)

## 1. Objectifs

Orbis Fidei a pour objectifs de :

- centraliser l'actualité religieuse internationale ;
- agréger automatiquement des informations provenant de médias chrétiens ;
- détecter les contenus similaires et les doublons ;
- proposer les informations pertinentes aux modérateurs ;
- permettre la vérification et l'édition des contenus avant publication ;
- publier les actualités en français, anglais et russe ;
- automatiser la traduction des articles validés ;
- permettre aux lecteurs de discuter autour de chaque article ;
- assurer une gestion fine des droits des utilisateurs ;
- conserver un historique des modifications et des décisions éditoriales.

Le projet doit être conçu comme un média éditorial assisté par des outils automatisés, et non comme un simple agrégateur automatique.

## 2. Fonctionnement général

Le fonctionnement repose sur une séparation entre l'agrégation automatique et la publication éditoriale.

```text
                    Médias chrétiens
                           |
                           v
                    +-------------+
                    | Agrégation  |
                    +-------------+
                           |
                           v
                +----------------------+
                | Analyse / classement |
                | Détection doublons   |
                +----------------------+
                           |
                           v
                +----------------------+
                | Proposition d'article|
                +----------------------+
                           |
                           v
                    +-------------+
                    | Modération  |
                    +-------------+
                      /     |      \
                     /      |       \
                 Rejet   Modification  Validation
                                      |
                                      v
                                 Publication
                                      |
                                      v
                            +----------------+
                            | Traduction IA |
                            +----------------+
                              /            \
                             v              v
                             EN             RU
                                      |
                                      v
                                Discussions
```

Les bots ne doivent jamais publier directement un article.

## 3. Interface publique

La page principale présente les actualités sous forme de liste compacte.

Chaque actualité peut être développée directement dans la liste par un clic.

Une actualité doit notamment pouvoir afficher :

- titre ;
- date ;
- source ;
- pays ou région ;
- catégorie ;
- langue originale ;
- résumé ;
- contenu ;
- image éventuelle ;
- lien vers la source originale ;
- nombre de commentaires.

L'utilisateur doit pouvoir :

- parcourir rapidement la liste ;
- développer une actualité ;
- réduire une actualité ;
- consulter la source originale ;
- participer à la discussion.

L'interface doit être responsive et fonctionner sur :

- ordinateur ;
- tablette ;
- smartphone.

## 4. Langues

Le portail sera disponible dans trois langues :

- Français (`fr`)
- Anglais (`en`)
- Russe (`ru`)

Un article constitue une entité éditoriale unique pouvant posséder plusieurs versions linguistiques.

```text
Article
├── FR
├── EN
└── RU
```

Les versions linguistiques restent liées au même article.

Chaque version conserve notamment :

- titre ;
- résumé ;
- contenu ;
- langue ;
- statut ;
- auteur ou origine de la traduction ;
- date de création ;
- date de modification ;
- historique des modifications.

## 5. Sources et agrégation

Le système doit pouvoir agréger automatiquement des informations provenant de médias chrétiens du monde entier.

Les sources pourront être intégrées notamment via :

- RSS ;
- Atom ;
- API ;
- autres mécanismes d'importation lorsque cela est techniquement et juridiquement approprié.

Chaque source doit être enregistrée avec notamment :

- nom ;
- URL ;
- pays ;
- langue ;
- type de média ;
- méthode d'agrégation ;
- fréquence de récupération ;
- statut actif/inactif.

La source originale d'une information doit toujours être conservée.

## 6. Agents automatisés

Plusieurs agents automatisés pourront intervenir dans le processus éditorial.

### 6.1 Agent d'agrégation

L'agent récupère périodiquement les nouveaux contenus des sources configurées.

Il doit notamment :

- récupérer les nouveaux contenus ;
- identifier les contenus déjà connus ;
- détecter les doublons ;
- détecter les contenus similaires ;
- extraire les métadonnées ;
- identifier la langue ;
- identifier le pays ou la région concernés lorsque cela est possible ;
- proposer une classification ;
- générer éventuellement un résumé ;
- transmettre les contenus pertinents au système de modération.

### 6.2 Agent de classement

L'agent peut attribuer un niveau de pertinence aux contenus collectés.

Il peut notamment prendre en compte :

- pertinence éditoriale ;
- fiabilité de la source ;
- nouveauté ;
- similarité avec des articles existants ;
- importance du sujet ;
- portée géographique.

Le classement constitue une aide à la décision et ne doit pas remplacer la décision éditoriale humaine.

### 6.3 Agent de traduction

Lorsqu'un article est validé dans une langue, un agent produit automatiquement les deux autres versions linguistiques.

Par exemple :

```text
Article validé en français
        |
        +----> Traduction anglaise
        |
        +----> Traduction russe
```

Les traductions automatiques doivent être identifiées comme telles tant qu'elles n'ont pas été éventuellement relues.

Une modification importante de la version originale pourra entraîner une nouvelle traduction.

## 7. Modération

Les contenus collectés automatiquement arrivent dans une interface réservée aux utilisateurs disposant des droits appropriés.

Le modérateur peut :

- consulter la source originale ;
- consulter les informations collectées ;
- modifier le titre ;
- modifier le résumé ;
- modifier le contenu ;
- modifier les catégories ;
- modifier les tags ;
- modifier les métadonnées ;
- accepter la proposition ;
- rejeter la proposition ;
- demander une révision ;
- publier l'article selon ses permissions.

Les actions importantes doivent être enregistrées dans l'historique éditorial.

## 8. Workflow éditorial

Chaque article possède un état correspondant à son cycle de vie.

Exemple :

```text
COLLECTED
    |
    v
SUGGESTED
    |
    +------> REJECTED
    |
    v
IN_REVIEW
    |
    +------> NEEDS_REVISION
    |
    v
APPROVED
    |
    v
TRANSLATING
    |
    v
PUBLISHED
    |
    v
ARCHIVED
```

Les transitions entre les différents états sont contrôlées par les permissions de l'utilisateur.

## 9. Gestion des utilisateurs et des droits

Le portail doit disposer d'un système de permissions hiérarchisées.

### Administrateur

Droits complets :

- gestion des utilisateurs ;
- gestion des rôles ;
- gestion des permissions ;
- gestion des sources ;
- gestion des catégories ;
- gestion des agents ;
- gestion des articles ;
- gestion de la modération ;
- gestion des commentaires ;
- accès aux journaux ;
- accès à l'historique.

### Responsable éditorial

- validation des articles ;
- modification des contenus ;
- publication ;
- supervision de la modération ;
- supervision des traductions.

### Modérateur

- consultation des propositions ;
- vérification des sources ;
- modification des contenus ;
- acceptation ou rejet ;
- soumission à un niveau de validation supérieur.

### Relecteur / traducteur

- consultation des traductions ;
- correction des traductions ;
- validation des versions linguistiques.

### Utilisateur enregistré

- consultation des articles ;
- participation aux discussions ;
- gestion de ses propres commentaires selon les règles du portail.

### Visiteur

- consultation des articles publics ;
- lecture des discussions.

Le système doit permettre l'ajout ultérieur de nouveaux rôles et permissions.

## 10. Discussions

Chaque article publié peut être associé à une discussion.

Les utilisateurs enregistrés peuvent :

- publier un commentaire ;
- répondre à un commentaire ;
- consulter les réponses ;
- signaler un commentaire ;
- modifier ou supprimer leurs propres commentaires selon les règles du portail.

La modération des commentaires est distincte de la modération éditoriale des articles.

Les modérateurs pourront notamment :

- masquer un commentaire ;
- supprimer un commentaire ;
- traiter les signalements ;
- suspendre un utilisateur selon leurs permissions.

## 11. Recherche et filtrage

Le portail devra proposer une recherche permettant de retrouver les actualités.

Les résultats pourront être filtrés selon :

- langue ;
- date ;
- pays ;
- région ;
- catégorie ;
- source ;
- tags ;
- type d'événement.

Une recherche plein texte devra être prévue.

Une recherche sémantique pourra être ajoutée ultérieurement.

## 12. Catégorisation

Les articles pourront être classés notamment selon :

- actualité des Églises ;
- société ;
- politique et religion ;
- culture ;
- théologie ;
- œcuménisme ;
- dialogue interreligieux ;
- liberté religieuse ;
- persécutions ;
- vie communautaire ;
- personnalités ;
- événements ;
- spiritualité ;
- autres catégories.

La taxonomie doit rester configurable par les administrateurs.

## 13. Architecture technique

### Frontend

Le frontend sera développé avec :

- Vue.js ;
- TypeScript ;
- Vue Router ;
- système de gestion d'état à définir ;
- bibliothèque de composants / CSS à définir.

Le frontend communiquera avec le backend exclusivement par l'intermédiaire de l'API.

### Backend

Le backend fournira une API permettant notamment :

- authentification ;
- gestion des utilisateurs ;
- gestion des rôles et permissions ;
- gestion des articles ;
- gestion des traductions ;
- gestion des sources ;
- gestion des catégories ;
- modération ;
- commentaires ;
- administration ;
- communication avec les agents automatisés.

Le framework backend sera défini lors de la conception technique.

### Agents / Workers

Les agents d'agrégation, de classement, de résumé et de traduction fonctionneront comme des processus indépendants du frontend.

Ils communiqueront avec le backend et/ou un système de tâches asynchrones.

Les agents devront être conçus de manière modulaire afin de pouvoir remplacer facilement un fournisseur ou un modèle d'IA.

## 14. Base de données

Le projet utilisera une base de données relationnelle.

Le choix privilégié est PostgreSQL.

Le modèle de données comporte en effet de nombreuses relations :

```text
User -------- Role
 |
 +----------- Comment
 |
 +----------- ModerationAction
 |
 +----------- EditorialHistory

Article ------ Source
 |
 +----------- ArticleTranslation
 |
 +----------- Category
 |
 +----------- Tag
 |
 +----------- Comment
 |
 +----------- EditorialHistory

Source ------- AggregationJob
```

PostgreSQL présente notamment les avantages suivants :

- intégrité référentielle ;
- transactions ;
- gestion efficace des écritures concurrentes ;
- bonnes performances avec de nombreuses relations ;
- recherche plein texte ;
- indexation avancée ;
- évolutivité ;
- possibilité d'utiliser ultérieurement des extensions telles que pgvector.

L'accès à la base sera réalisé via un ORM, afin de limiter le couplage de l'application avec le moteur de base de données.

Le choix définitif de l'ORM sera précisé lors de la conception technique.

## 15. Tâches asynchrones

Les opérations suivantes ne doivent pas bloquer les requêtes HTTP normales :

- récupération des sources ;
- analyse des contenus ;
- détection des doublons ;
- génération de résumés ;
- traduction ;
- indexation ;
- traitements périodiques.

Un système de jobs/workers devra donc être prévu.

Exemple :

```text
                Backend
                   |
                   v
              Task Queue
             /    |     \
            /     |      \
           v      v       v
      Aggregator  AI    Translator
```

Le choix de la technologie de file de tâches sera défini lors de la conception technique.

## 16. Authentification et sécurité

Le système devra assurer :

- authentification sécurisée ;
- gestion des sessions ou tokens ;
- contrôle d'accès basé sur les rôles ;
- validation des données entrantes ;
- protection contre les attaques courantes ;
- limitation des requêtes ;
- journalisation des actions sensibles.

Les clés API et secrets utilisés par les agents et services externes ne devront jamais être exposés au frontend.

## 17. Historique et traçabilité

Les opérations éditoriales importantes doivent être historisées.

Le système doit permettre de déterminer :

- quelle source a fourni une information ;
- quel agent l'a collectée ;
- quel agent l'a analysée ;
- qui l'a modifiée ;
- qui l'a validée ;
- qui l'a publiée ;
- quelles traductions ont été générées ;
- qui a corrigé une traduction ;
- quelles modifications ont été effectuées.

L'objectif est d'assurer une traçabilité complète de la chaîne éditoriale.

## 18. Principes éditoriaux et techniques

### L'automatisation assiste, elle ne décide pas

Les agents peuvent :

- collecter ;
- analyser ;
- classer ;
- résumer ;
- détecter des similitudes ;
- traduire ;
- suggérer.

Ils ne doivent pas pouvoir publier directement.

### Les sources restent identifiables

Chaque article publié doit permettre d'identifier clairement la source de l'information.

### Les contenus ne sont pas simplement recopiés

Le système doit privilégier la création d'un contenu éditorial propre à Orbis Fidei à partir des informations collectées, tout en conservant un lien vers la source originale.

Les modalités exactes de reprise de contenus devront respecter les droits applicables aux sources.

### Les décisions humaines sont traçables

Toute validation, modification ou publication importante doit pouvoir être retrouvée.

## 19. Structure envisagée du dépôt

```text
orbis-fidei/
│
├── frontend/
│   └── Vue.js
│
├── backend/
│   └── API
│
├── workers/
│   ├── aggregator/
│   ├── classifier/
│   ├── summarizer/
│   └── translator/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── shared/
│   └── types/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── editorial/
│
├── tests/
│
├── docker/
│
└── README.md
```

Cette organisation pourra évoluer avec le projet.

## 20. MVP

La première version du projet devra se concentrer sur les fonctionnalités essentielles.

### Interface publique

- liste compacte des actualités ;
- dépliage d'une actualité au clic ;
- affichage de la source ;
- sélection FR / EN / RU ;
- affichage des discussions ;
- publication de commentaires pour les utilisateurs authentifiés.

### Administration

- authentification ;
- gestion des utilisateurs ;
- rôles et permissions ;
- gestion des sources ;
- réception des propositions ;
- consultation des sources ;
- modification des contenus ;
- validation ;
- publication.

### Automatisation

- récupération RSS / Atom ;
- détection des doublons ;
- création de propositions ;
- classement initial ;
- génération de résumés ;
- traduction après validation.

### Infrastructure

- API backend ;
- PostgreSQL ;
- ORM ;
- système de jobs asynchrones ;
- logs ;
- tests automatisés ;
- environnement de développement reproductible ;
- configuration Docker.

## 21. Évolutions futures

Le projet pourra ultérieurement intégrer :

- davantage de langues ;
- podcasts ;
- vidéos ;
- newsletters ;
- notifications ;
- comptes pour les médias partenaires ;
- recherche sémantique ;
- recommandation personnalisée ;
- application mobile ;
- API publique ;
- statistiques éditoriales ;
- tableau de bord des sources ;
- détection avancée des doublons ;
- analyse de la fiabilité des sources ;
- outils de vérification des informations ;
- système de réputation des sources.
