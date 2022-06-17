import { Test, TestingModule } from '@nestjs/testing';
import { LoadersService } from '../loaders.service';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from '../../config/validation';
import { config } from '../../config/config';
import { CacheModule } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { CommonModule } from '../../common/common.module';
import { UploaderModule } from '../../uploader/uploader.module';
import { EntityManager } from '@mikro-orm/sqlite';
import { UserEntity } from '../../users/entities/user.entity';
import { fakeName, picture } from '../../common/tests/mocks';
import { faker } from '@faker-js/faker';
import { CommonService } from '../../common/common.service';
import { hash } from 'bcrypt';
import { RoleEnum } from '../../users/enums/role.enum';
import { TagEntity } from '../../tags/entities/tag.entity';
import { SeriesEntity } from '../../series/entities/series.entity';
import { UploaderService } from '../../uploader/uploader.service';
import { RatioEnum } from '../../common/enums/ratio.enum';
import { SeriesTagEntity } from '../../series/entities/series-tag.entity';
import { SeriesFollowerEntity } from '../../series/entities/series-follower.entity';
import { PostTagEntity } from '../../posts/entities/post-tag.entity';
import { PostEntity } from '../../posts/entities/post.entity';
import { ILoader } from '../interfaces/loader.interface';
import { QueryOrder } from '@mikro-orm/core';
import { FilterRelationDto } from '../../common/dtos/filter-relation.dto';
import { QueryOrderEnum } from '../../common/enums/query-order.enum';
import { IGqlCtx } from '../../common/interfaces/gql-ctx.interface';
import { v4 } from 'uuid';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { CommentLikeEntity } from '../../comments/entities/comment-like.entity';
import { PostLikeEntity } from '../../posts/entities/post-like.entity';

describe('LoadersService', () => {
  let loadersService: LoadersService,
    commonService: CommonService,
    uploaderService: UploaderService,
    em: EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema,
          load: [config],
        }),
        CacheModule.register({
          isGlobal: true,
          ttl: parseInt(process.env.REDIS_CACHE_TTL, 10),
        }),
        MikroOrmModule.forRootAsync({
          imports: [ConfigModule],
          useClass: MikroOrmConfig,
        }),
        CommonModule,
        UploaderModule,
      ],
      providers: [
        LoadersService,
        {
          provide: 'CommonModule',
          useClass: CommonModule,
        },
        {
          provide: 'UploaderModule',
          useClass: UploaderModule,
        },
      ],
    }).compile();

    loadersService = module.get<LoadersService>(LoadersService);
    commonService = module.get<CommonService>(CommonService);
    uploaderService = module.get<UploaderService>(UploaderService);
    em = module.get<EntityManager>(EntityManager);
  });

  const userIds: number[] = [];
  describe('Users Creation', () => {
    it('Should create 10 users', async () => {
      const users: UserEntity[] = [];

      for (let i = 0; i < 10; i++) {
        const name = fakeName();
        users.push(
          em.create(UserEntity, {
            name,
            email: faker.internet.email(),
            username: commonService.generatePointSlug(name),
            password: await hash('Ab123456', 5),
            confirmed: true,
            role: RoleEnum.PUBLISHER,
          }),
        );
      }

      await em.persistAndFlush(users);
      userIds.push(...users.map((user) => user.id));
    });
  });

  const tagIds: Record<string, number[]> = {};
  describe('Tags Creation', () => {
    it('Should create 5 tags per user', async () => {
      for (let i = 0; i < 10; i++) {
        const userId = userIds[i];
        const tags: TagEntity[] = [];

        for (let j = 0; j < 5; j++) {
          tags.push(
            em.create(TagEntity, {
              name: fakeName(),
              author: userId,
            }),
          );
        }

        await em.persistAndFlush(tags);
        tagIds[userId] = tags.map((tag) => tag.id);
      }
    });
  });

  let commonPicture: string;
  const seriesIds: Record<string, number[]> = {};
  describe('Series Creation', () => {
    it('Should create 5 series for each user', async () => {
      commonPicture = await uploaderService.uploadImage(
        userIds[0],
        picture(),
        RatioEnum.BANNER,
      );

      for (let i = 0; i < 10; i++) {
        const userId = userIds[i];
        const seriesArr: SeriesEntity[] = [];

        for (let j = 0; j < 5; j++) {
          const title = fakeName();
          seriesArr.push(
            em.create(SeriesEntity, {
              title,
              description: faker.lorem.words(2),
              slug: commonService.generateSlug(title),
              author: userId,
              picture: commonPicture,
            }),
          );
        }

        await em.persistAndFlush(seriesArr);
        seriesIds[userId] = seriesArr.map((series) => series.id);
      }
    });

    it('Should add tags to series', async () => {
      const seriesTags: SeriesTagEntity[] = [];

      for (let i = 0; i < 10; i++) {
        const userId = userIds[i];
        const seriesArr = seriesIds[userId];
        const tagsArr = tagIds[userId];

        for (let j = 0; j < 5; j++) {
          const seriesId = seriesArr[j];

          for (let k = 0; k < 5; k++) {
            const tagId = tagsArr[k];
            seriesTags.push(
              em.create(SeriesTagEntity, {
                series: seriesId,
                tag: tagId,
              }),
            );
          }
        }
      }

      await em.persistAndFlush(seriesTags);
    });

    it('Should add followers to series', async () => {
      const seriesIdsArr: number[] = [];
      for (let i = 0; i < 10; i++) {
        const userId = userIds[i];
        const seriesArr = seriesIds[userId];
        seriesIdsArr.push(...seriesArr);
      }

      const series = await em.find(SeriesEntity, {
        id: {
          $in: seriesIdsArr,
        },
      });
      const followers: SeriesFollowerEntity[] = [];

      for (let i = 0; i < series.length; i++) {
        const singleSeries = series[i];

        for (let j = 0; j < 10; j++) {
          const userId = userIds[j];
          if (singleSeries.author.id !== userId) {
            followers.push(
              em.create(SeriesFollowerEntity, {
                series: singleSeries.id,
                user: userId,
              }),
            );
          }
        }
      }

      await em.persistAndFlush(followers);
    });

    it('Should create Posts And Post Tags', async () => {
      const postTags: PostTagEntity[] = [];

      for (let i = 0; i < 10; i++) {
        const userId = userIds[i];
        const tagsArr = tagIds[userId];
        const posts: PostEntity[] = [];

        for (let j = 0; j < 5; j++) {
          const title = fakeName();
          posts.push(
            em.create(PostEntity, {
              title,
              slug: commonService.generateSlug(title),
              content: faker.lorem.words(2),
              picture: commonPicture,
              author: userId,
            }),
          );
        }

        await em.persistAndFlush(posts);

        for (let j = 0; j < 5; j++) {
          const postId = posts[j].id;
          for (let k = 0; k < tagsArr.length; k++) {
            const tagId = tagsArr[k];
            postTags.push(
              em.create(PostTagEntity, {
                post: postId,
                tag: tagId,
              }),
            );
          }
        }
      }

      await em.persistAndFlush(postTags);
    });
  });

  describe('Series Loaders', () => {
    it('Should load authors', async () => {
      const series = await em
        .createQueryBuilder(SeriesEntity, 's')
        .where({
          author: {
            $in: userIds,
          },
        })
        .getResult();
      const data: ILoader<SeriesEntity>[] = series.map((obj) => ({
        obj,
        params: undefined,
      }));

      const authors = await loadersService.getLoaders().Series.author(data);

      for (let i = 0; i < series.length; i++) {
        const s = series[i];
        const a = authors[i];
        expect(s.author.id).toBe(a.id);
        expect(a.username).toBeDefined();
      }
    });

    it('Should load tags', async () => {
      const series = await em
        .createQueryBuilder(SeriesEntity, 's')
        .where({
          author: {
            $in: userIds,
          },
        })
        .getResult();
      const data: ILoader<SeriesEntity>[] = series.map((obj) => ({
        obj,
        params: undefined,
      }));

      await em.populate(series, ['tags', 'tags.tag'], {
        orderBy: {
          tags: {
            tag: {
              name: QueryOrder.ASC,
            },
          },
        },
      });
      const tags = await loadersService.getLoaders().Series.tags(data);

      for (let i = 0; i < series.length; i++) {
        const s = series[i];
        const tagArr = tags[i];
        expect(s.tags.isInitialized()).toBe(true);
        const seriesTags = s.tags.getItems();

        for (let j = 0; j < seriesTags.length; j++) {
          const seriesTag = seriesTags[j];
          const tag = tagArr[j];
          expect(seriesTag.tag.id).toBe(tag.id);
        }
      }
    });

    it('Should load posts count', async () => {
      const series = await em
        .createQueryBuilder(SeriesEntity, 's')
        .where({
          author: {
            $in: userIds,
          },
        })
        .getResult();
      const data: ILoader<SeriesEntity>[] = series.map((obj) => ({
        obj,
        params: undefined,
      }));
      const postsCount = await loadersService
        .getLoaders()
        .Series.postsCount(data);

      for (let i = 0; i < postsCount.length; i++) {
        expect(postsCount[i]).toBe(5);
      }
    });

    it('Should load followers', async () => {
      const series = await em
        .createQueryBuilder(SeriesEntity, 's')
        .where({
          author: {
            $in: userIds,
          },
        })
        .getResult();
      const data: ILoader<SeriesEntity, FilterRelationDto>[] = series.map(
        (obj) => ({
          obj,
          params: {
            first: 2,
            order: QueryOrderEnum.ASC,
          },
        }),
      );
      const followers = await loadersService
        .getLoaders()
        .Series.followers(data);

      for (const paginated of followers) {
        expect(paginated.edges.length).toBe(2);
        expect(paginated.pageInfo.hasNextPage).toBe(true);
        expect(paginated.pageInfo.hasPreviousPage).toBe(false);
        expect(paginated.currentCount).toBe(9);
      }
    });

    it('Should load followers count', async () => {
      const series = await em
        .createQueryBuilder(SeriesEntity, 's')
        .where({
          author: {
            $in: userIds,
          },
        })
        .getResult();
      const data: ILoader<SeriesEntity>[] = series.map((obj) => ({
        obj,
        params: undefined,
      }));

      const followersCount = await loadersService
        .getLoaders()
        .Series.followersCount(data);

      for (const count of followersCount) {
        expect(count).toBe(9);
      }
    });

    it('Should load followed', async () => {
      const ctx: Partial<IGqlCtx> = {
        ws: {
          sessionId: v4(),
          role: RoleEnum.PUBLISHER,
          id: userIds[0],
        },
      };

      const series = await em
        .createQueryBuilder(SeriesEntity, 's')
        .where({
          author: {
            $in: userIds,
          },
        })
        .getResult();
      const data: ILoader<SeriesEntity>[] = series.map((obj) => ({
        obj,
        params: undefined,
      }));

      const followed = await loadersService
        .getLoaders()
        .Series.followed(data, ctx as any);
      for (let i = 0; i < followed.length; i++) {
        const s = series[i];
        expect(followed[i]).toBe(s.author.id !== userIds[0]);
      }
    });
  });

  describe('Comments Creation', () => {
    const comments: CommentEntity[] = [];
    it('Should create comments', async () => {
      const posts = await em.find(PostEntity, {
        author: {
          $in: userIds,
        },
      });

      for (let i = 0; i < posts.length; i++) {
        for (let j = 0; j < 10; j++) {
          comments.push(
            em.create(CommentEntity, {
              author: userIds[j],
              post: posts[i].id,
              content: faker.lorem.words(2),
            }),
          );
        }
      }

      await em.persistAndFlush(comments);
    });

    it('Should like comments', async () => {
      const commentLikes: CommentLikeEntity[] = [];

      for (const comment of comments) {
        for (const userId of userIds) {
          if (comment.author.id !== userId) {
            commentLikes.push(
              em.create(CommentLikeEntity, {
                comment: comment.id,
                user: userId,
              }),
            );
          }
        }
      }

      await em.persistAndFlush(commentLikes);
    });
  });

  describe('Posts Loaders', () => {
    it('Should load authors', async () => {
      const posts = await em.find(PostEntity, {
        author: {
          $in: userIds,
        },
      });
      const data: ILoader<PostEntity>[] = posts.map((obj) => ({
        obj,
        params: undefined,
      }));

      for (const post of posts) {
        expect(post.author.id).toBeDefined();
        expect(post.author.username).toBeUndefined();
      }

      const authors = await loadersService.getLoaders().Post.author(data);

      for (const author of authors) {
        expect(author.id).toBeDefined();
        expect(author.username).toBeDefined();
      }
    });

    it('Should load tags', async () => {
      const posts = await em.find(PostEntity, {
        author: {
          $in: userIds,
        },
      });
      const data: ILoader<PostEntity>[] = posts.map((obj) => ({
        obj,
        params: undefined,
      }));

      for (const post of posts) {
        expect(post.tags.isInitialized()).toBe(false);
      }

      const tags = await loadersService.getLoaders().Post.tags(data);

      for (const tagArr of tags) {
        expect(tagArr.length).toBe(5);
      }
    });

    it('Should load likes', async () => {
      const posts = await em.find(PostEntity, {
        author: {
          $in: userIds,
        },
      });
      const data: ILoader<PostEntity, FilterRelationDto>[] = posts.map(
        (obj) => ({
          obj,
          params: {
            first: 5,
            order: QueryOrderEnum.ASC,
          },
        }),
      );

      const likes = await loadersService.getLoaders().Post.likes(data);

      for (const paginated of likes) {
        expect(paginated.edges.length).toBe(0);
        expect(paginated.pageInfo.hasNextPage).toBe(false);
        expect(paginated.pageInfo.hasPreviousPage).toBe(false);
        expect(paginated.currentCount).toBe(0);
      }

      const postsLikes: PostLikeEntity[] = [];

      for (const post of posts) {
        for (const userId of userIds) {
          if (post.author.id !== userId) {
            postsLikes.push(
              em.create(PostLikeEntity, {
                post: post.id,
                user: userId,
              }),
            );
          }
        }
      }

      await em.persistAndFlush(postsLikes);

      const likes2 = await loadersService.getLoaders().Post.likes(data);

      for (const paginated of likes2) {
        expect(paginated.edges.length).toBe(5);
        expect(paginated.pageInfo.hasNextPage).toBe(true);
        expect(paginated.pageInfo.hasPreviousPage).toBe(false);
        expect(paginated.currentCount).toBe(9);
      }
    });

    it('Should load likes count', async () => {
      const posts = await em.find(PostEntity, {
        author: {
          $in: userIds,
        },
      });
      const data: ILoader<PostEntity>[] = posts.map((obj) => ({
        obj,
        params: undefined,
      }));
      const likesCount = await loadersService
        .getLoaders()
        .Post.likesCount(data);

      for (const count of likesCount) {
        expect(count).toBe(9);
      }
    });

    it('Should load comments', async () => {
      const posts = await em.find(PostEntity, {
        author: {
          $in: userIds,
        },
      });
      const data: ILoader<PostEntity, FilterRelationDto>[] = posts.map(
        (obj) => ({
          obj,
          params: {
            first: 4,
            order: QueryOrderEnum.ASC,
          },
        }),
      );
      const comments = await loadersService.getLoaders().Post.comments(data);

      for (const paginated of comments) {
        expect(paginated.edges.length).toBe(4);
        expect(paginated.pageInfo.hasNextPage).toBe(true);
        expect(paginated.pageInfo.hasPreviousPage).toBe(false);
        expect(paginated.currentCount).toBe(10);
      }
    });

    it('Should load comments count', async () => {
      const posts = await em.find(PostEntity, {
        author: {
          $in: userIds,
        },
      });
      const data: ILoader<PostEntity>[] = posts.map((obj) => ({
        obj,
        params: undefined,
      }));
      const commentsCount = await loadersService
        .getLoaders()
        .Post.commentsCount(data);

      for (const count of commentsCount) {
        expect(count).toBe(10);
      }
    });

    it('Should load liked', async () => {
      const ctx: Partial<IGqlCtx> = {
        ws: {
          sessionId: v4(),
          role: RoleEnum.PUBLISHER,
          id: userIds[0],
        },
      };
      const posts = await em.find(PostEntity, {
        author: {
          $in: userIds,
        },
      });
      const data: ILoader<PostEntity>[] = posts.map((obj) => ({
        obj,
        params: undefined,
      }));

      const liked = await loadersService
        .getLoaders()
        .Post.liked(data, ctx as any);

      for (let i = 0; i < liked.length; i++) {
        const post = posts[i];
        expect(liked[i]).toBe(post.author.id !== userIds[0]);
      }
    });
  });

  it('should be defined', () => {
    expect(loadersService).toBeDefined();
    expect(commonService).toBeDefined();
    expect(uploaderService).toBeDefined();
    expect(em).toBeDefined();
  });
});
