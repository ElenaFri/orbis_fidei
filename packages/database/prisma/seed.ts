import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = [
    { key: 'article.read', description: 'Lire les articles' },
    { key: 'article.create', description: 'Créer un article' },
    { key: 'article.edit', description: 'Modifier un article' },
    { key: 'article.publish', description: 'Publier un article' },
    { key: 'article.archive', description: 'Archiver un article' },
    { key: 'proposal.review', description: 'Évaluer une proposition' },
    { key: 'translation.review', description: 'Relire une traduction' },
    { key: 'comment.moderate', description: 'Modérer les commentaires' },
    { key: 'source.manage', description: 'Gérer les sources' },
    { key: 'user.manage', description: 'Gérer les utilisateurs et rôles' },
    { key: 'category.manage', description: 'Gérer les catégories et tags' },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: DEFAULT_PERMISSIONS.map((p) => p.key),
    EDITOR_IN_CHIEF: [
        'article.read',
        'article.edit',
        'article.publish',
        'article.archive',
        'proposal.review',
        'translation.review',
        'comment.moderate',
        'category.manage',
    ],
    MODERATOR: ['article.read', 'article.edit', 'proposal.review', 'comment.moderate'],
    TRANSLATOR: ['article.read', 'translation.review'],
    REGISTERED_USER: ['article.read'],
};

async function main() {
    for (const permission of DEFAULT_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { key: permission.key },
            update: { description: permission.description },
            create: permission,
        });
    }

    for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName },
        });

        const permissions = await prisma.permission.findMany({
            where: { key: { in: permissionKeys } },
        });

        for (const permission of permissions) {
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: { roleId: role.id, permissionId: permission.id },
                },
                update: {},
                create: { roleId: role.id, permissionId: permission.id },
            });
        }
    }

    const defaultCategories = [
        { key: 'churches', labelFr: 'Actualité des Églises', labelEn: 'Church news', labelRu: 'Церковные новости' },
        { key: 'society', labelFr: 'Société', labelEn: 'Society', labelRu: 'Общество' },
        { key: 'theology', labelFr: 'Théologie', labelEn: 'Theology', labelRu: 'Богословие' },
        { key: 'ecumenism', labelFr: 'Œcuménisme', labelEn: 'Ecumenism', labelRu: 'Экуменизм' },
        { key: 'freedom', labelFr: 'Liberté religieuse', labelEn: 'Religious freedom', labelRu: 'Свобода вероисповедания' },
        { key: 'persecutions', labelFr: 'Persécutions', labelEn: 'Persecutions', labelRu: 'Гонения' },
        { key: 'spirituality', labelFr: 'Spiritualité', labelEn: 'Spirituality', labelRu: 'Духовность' },
    ];

    for (const category of defaultCategories) {
        await prisma.category.upsert({
            where: { key: category.key },
            update: category,
            create: category,
        });
    }

    console.log('✓ Seed terminé (permissions, rôles, catégories par défaut)');
}

try {
    await main();
} catch (error) {
    console.error(error);
    process.exit(1);
} finally {
    await prisma.$disconnect();
}
