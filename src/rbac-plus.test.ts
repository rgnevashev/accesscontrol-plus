import { RBACPlus, Role, Resource, Scope, All } from './rbac-plus';
import { IContext } from './interfaces';
import { Permission } from './permission';

describe('RBACPlus', async function () {
  describe('#deny', function () {
    it('should generate a valid role', function () {
      const rbac = new RBACPlus();
      const role = rbac.deny('user');
      expect(role).toBeInstanceOf(Role);
      expect(role.effect).toEqual('deny');
      expect(rbac.roles).toEqual({
        user: { resources: {}}
      });
    });
  });

  describe('#grant', async function () {
    it('should generate a valid role', async function () {
      const rbac = new RBACPlus();
      expect(rbac.grant('user')).toBeInstanceOf(Role);
      expect(rbac.roles).toEqual({
        user: { resources: {}}
      });
    });

    it('should add new roles by chaining', async function () {
      const rbac = new RBACPlus();
      expect(rbac.grant('user').grant('admin')).toBeInstanceOf(Role);
      expect(rbac.roles).toEqual({
        user: { resources: {}},
        admin: { resources: {}}
      });
    });

    describe('Role', async function () {

      describe('when denied', function () {
        it('should create a resource where effect is deny', function () {
          const rbac = new RBACPlus();
          const resource = rbac.deny('user').resource('post');
          expect(resource).toBeInstanceOf(Resource);
          expect(resource.effect).toEqual('deny');
        });
      });

      describe('#inherit', async function () {
        it('should allow inheritance', async function () {
          const rbac = new RBACPlus();
          expect(rbac.grant('admin').inherits('user')).toBeInstanceOf(Role);
          expect(rbac.roles).toEqual({
            admin: { inherits: ['user'], resources: {} }
          });
        });

        it('should allow multiple inheritance', async function () {
          const rbac = new RBACPlus();
          rbac.grant('admin')
            .inherits('user')
            .inherits('public');

          expect(rbac.roles.admin.inherits).toEqual(['user', 'public']);
        });

        it('should not create a duplicate inheritance entry', function () {
          const rbac = new RBACPlus();
          rbac.grant('admin')
            .inherits('user')
            .inherits('user');
          expect(rbac.roles.admin.inherits).toEqual(['user']);
        });
      });

      describe('#scope', function () {
        it('should return a Scope', function () {
          const rbac = new RBACPlus();
          expect(rbac.grant('user').scope('Post:read')).toBeInstanceOf(Scope);
          expect(rbac.roles).toEqual({
            user: { resources: { Post: { read: [{
              condition: All,
              constraint: {},
              effect: 'grant'
            }] } }}
          });
        });

        describe('Scope', function () {
          it('should allow adding field tests', function () {
            const rbac = new RBACPlus();
            expect(rbac.grant('user').scope('Post:read').onFields('*', '!a', 'b', 'c')).toBeInstanceOf(Scope);
            expect(rbac.roles.user.resources.Post.read[0].fieldGenerator).toBeInstanceOf(Function);
          });

          it('should allow adding logical conditions', function () {
            const rbac = new RBACPlus();
            expect(rbac.grant('user').scope('Post:read').where((ctx: IContext) => true)).toBeInstanceOf(Scope);
            expect(rbac.grant('user').scope('Post:read').and((ctx: IContext) => true)).toBeInstanceOf(Scope);
            expect(rbac.grant('user').scope('Post:read').or((ctx: IContext) => true)).toBeInstanceOf(Scope);
          });

          it('should allow adding multiple and expressions', function () {
            const rbac = new RBACPlus();
            expect(
              rbac.grant('user').scope('Post:read')
                .and((ctx: IContext) => true, (cts: IContext) => true)
            ).toBeInstanceOf(Scope);
          });

          it('should allow adding multiple or expressions', function () {
            const rbac = new RBACPlus();
            function test(ctx: IContext) { return true; }
            expect(
              rbac.grant('user').scope('Post:read')
                .or(test, test, test)
            ).toBeInstanceOf(Scope);
          });

          it('should allow adding multiple where expressions', function () {
            const rbac = new RBACPlus();
            function test(ctx: IContext) { return true; }
            expect(
              rbac.grant('user').scope('Post:read')
                .where(test, test, test)
            ).toBeInstanceOf(Scope);
          });

          it('should allow chaining of and and or expressions', function () {
            const rbac = new RBACPlus();
            function test(ctx: IContext) { return true; }
            expect(
              rbac.grant('user').scope('Post:read')
                .where(test).and(test).or(test)
            ).toBeInstanceOf(Scope);
          });

          describe('when denied', function () {
            it('should create a scope which is denied', function () {
              const rbac = new RBACPlus();
              const scope = rbac.deny('public').resource('post').action('create');
              expect(scope.effect).toEqual('deny');
            });
          });
        });
      });

      describe('#resource', function () {
        it('should return a Resource', function () {
          const rbac = new RBACPlus();
          expect(rbac.grant('user').resource('Post')).toBeInstanceOf(Resource);
          expect(rbac.roles).toEqual({
            user: { resources: { Post: {} }}
          });
        });

        it('should add new resources by chaining', async function () {
          const rbac = new RBACPlus();
          expect(rbac.grant('user').resource('Post').resource('Comment')).toBeInstanceOf(Resource);
          expect(rbac.roles).toEqual({
            user: { resources: {
              Post: {},
              Comment: {}
            }}
          });
        });

        describe('#action', async function () {
          it('should return a scope', async function () {
            const rbac = new RBACPlus();
            expect(rbac.grant('user').resource('Post').action('read')).toBeInstanceOf(Scope);
          });

          it('should allow adding multiple actions', async function () {
            const rbac = new RBACPlus();
            const condition1 = (ctx: IContext) => ctx === 1;
            const condition2 = (ctx: IContext) => ctx === 2;
            rbac.grant('user')
              .resource('Post')
                .read.where(condition1).onFields('c1Field')
                .read.where(condition2).onFields('c2Field');

            expect(rbac.roles.user.resources.Post.read).toHaveLength(2);
          });
        });

        describe('CRUD properties', function () {
          it('should offer a create action', function () {
            const rbac = new RBACPlus();
            const scope = rbac.grant('user').resource('post').create;
            expect(scope).toBeInstanceOf(Scope);
            expect(rbac.roles.user.resources.post.create).toBeDefined();
          });

          it('should offer a read action', function () {
            const rbac = new RBACPlus();
            const scope = rbac.grant('user').resource('post').read;
            expect(scope).toBeInstanceOf(Scope);
            expect(rbac.roles.user.resources.post.read).toBeDefined();
          });

          it('should offer a update action', function () {
            const rbac = new RBACPlus();
            const scope = rbac.grant('user').resource('post').update;
            expect(scope).toBeInstanceOf(Scope);
            expect(rbac.roles.user.resources.post.update).toBeDefined();
          });

          it('should offer a delete action', function () {
            const rbac = new RBACPlus();
            const scope = rbac.grant('user').resource('post').delete;
            expect(scope).toBeInstanceOf(Scope);
            expect(rbac.roles.user.resources.post.delete).toBeDefined();
          });
        });
      });
    });
  });

  describe('#can', async function () {
    describe('role with where scope', async function () {
      const userOwnsResource = ({resource, user}) => resource.ownerId === user.id;
      const rbac = new RBACPlus();
      rbac.grant('user')
        .resource('Post')
          .action('create')
            .where(userOwnsResource);

      it('should return a permission where .granted is a string when permission is granted', async function () {
        const permission = await rbac.can('user', 'Post:create', {
          resource: { ownerId: 123},
          user: { id: 123 }
        });
        expect(typeof permission.granted).toEqual('string');
      });

      it('should return a permission where granted is undefined and denied is a list of ' +
          'rejected scopes when permission is denied', async function () {
        const permission = await rbac.can('user', 'Post:create', {
          resource: { ownerId: 999},
          user: { id: 123 }
        });
        expect(permission.granted).toBeUndefined();
        expect(permission.denied).toEqual([{request: 'user:Post:create::userOwnsResource'}]);
      });

      it('should return a permission where denied is an empty list when no scope matched', async function () {
        const permission = await rbac.can('user', 'Post:unknown');
        expect(permission.granted).toBeUndefined();
        expect(permission.denied).toEqual([]);
      });
    });

    describe('role with scopes for fields', async function () {
      it('should grant permission for an allowed field', async function () {
        const rbac = new RBACPlus();
        rbac.grant('user').scope('post:read').onFields('foo', '!bar');
        const permission = await rbac.can('user', 'post:read:foo');
        expect(permission.granted).toBeTruthy();
      });

      it('should deny permission for a !negated field', async function () {
        const rbac = new RBACPlus();
        rbac.grant('user').scope('post:read').onFields('foo', '!bar');
        const permission = await rbac.can('user', 'post:read:bar');
        expect(permission.granted).toBeFalsy();
      });

      it('should allow permission fields matched by wildcard', async function () {
        const rbac = new RBACPlus();
        rbac.grant('user').scope('post:read').onFields('*', '!bar');
        const permission = await rbac.can('user', 'post:read:foo');
        expect(permission.granted).toBeTruthy();
      });
      it('should allow permission fields with wildcard except for !negated fields', async function () {
        const rbac = new RBACPlus();
        rbac.grant('user').scope('post:read').onFields('*', '!bar');
        const permission = await rbac.can('user', 'post:read:bar');
        expect(permission.granted).toBeFalsy();
      });

      it('should disallow invalid field names', function () {
        const rbac = new RBACPlus();
        expect(() => rbac.grant('user').scope('post:read').onFields(''))
          .toThrow();
      });

      it('should allow setting dynamic field generator', function () {
        const rbac = new RBACPlus();
        rbac.grant('user').scope('post:read').onDynamicFields((c: IContext) => c);
        expect(rbac.roles.user.resources.post.read[0].fieldGenerator).toBeInstanceOf(Function);
        expect(rbac.roles.user.resources.post.read[0].fieldGenerator({foo: 1, bar: 2}))
          .toEqual({ foo: 1, bar: 2});
      });
    });

    describe('when handling denied roles,', function () {
      it('should deny when the inherited role allows, but the inheriting role denies', async function () {
        const rbac = new RBACPlus();
        rbac
          .grant('baseRole').scope('*:*')
          .deny('superRole').inherits('baseRole')
            .scope('foo:bar');
        const basePerm = await rbac.can('baseRole', 'foo:bar');
        const superPerm = await rbac.can('superRole', 'foo:bar');

        expect(basePerm.granted).toBeTruthy();
        expect(superPerm.granted).toBeFalsy();
      });

      it('should override a previous wildcard grant for the same role', async function () {
        const rbac = new RBACPlus();
        rbac
          .grant('user')
            .scope('foo:*')
          .deny('user')
            .scope('foo:bar');
        const permission = await rbac.can('user', 'foo:bar');
        expect(permission.granted).toBeFalsy();
      });

      it('should override a later grant of the same permission for the same role', async function () {
        const rbac = new RBACPlus();
        rbac
          .deny('user')
            .scope('foo:bar')
          .grant('user')
            .scope('foo:bar'); // never accessed
        const permission = await rbac.can('user', 'foo:bar');
        expect(permission.granted).toBeFalsy();
      });

      it('should not override a later grant of a different permission for the same role', async function () {
        const rbac = new RBACPlus();
        rbac
          .deny('user')
            .scope('foo:bar')
          .grant('user')
            .scope('foo:BAZ'); // never accessed
        const permission = await rbac.can('user', 'foo:BAZ');
        expect(permission.granted).toBeTruthy();
      });

      it('should not override a later grant on a different field', async function () {
        const rbac = new RBACPlus();
        rbac
          .deny('user')
            .scope('foo:bar').onFields('hello')
          .grant('user')
            .scope('foo:bar').onFields('sailor'); // never accessed
        const permission = await rbac.can('user', 'foo:bar:sailor');
        expect(permission.granted).toBeTruthy();
      });

      it('should not override a later grant if the condition fails', async function () {
        const rbac = new RBACPlus();
        const alwaysFalse = (context: IContext) => false;
        rbac
          .deny('user')
            .scope('foo:bar').where(alwaysFalse)
          .grant('user')
            .scope('foo:bar'); // never accessed
        const permission = await rbac.can('user', 'foo:bar');
        expect(permission.granted).toBeTruthy();
      });
    });

    describe('when checking inherited permissions,', function () {
      it('should return a valid permission for an inherited role', async function () {
        const rbac = new RBACPlus();

        rbac
          .grant('public').scope('read:post')
          .grant('user').inherits('public');

        const permission = await rbac.can('user', 'read:post');
        expect(permission.granted).toEqual('public:read:post::All');
      });
    });

    describe('with multiple scopes for the same action', function () {
      const rbac = new RBACPlus();
      const condition1 = (ctx: IContext) => ctx === 1;
      const condition2 = (ctx: IContext) => ctx === 2;
      rbac.grant('user')
        .resource('Post')
          .read.where(condition1).onFields('c1Field').withConstraint('c1 constraint')
          .read.where(condition2).onFields('c2Field').withConstraint('c2 constraint');

      it('should grant permission for each scope', async function () {
        const p1 = await rbac.can('user', 'Post:read', 1);
        expect(p1.granted).toEqual('user:Post:read::condition1');

        const p2 = await rbac.can('user', 'Post:read', 2);
        expect(p2.granted).toEqual('user:Post:read::condition2');
      });

      it('should distinguish fields for each granted scope on the action', async function () {
        const p1 = await rbac.can('user', 'Post:read:c1Field', 1);
        expect(p1.granted).toBeTruthy();

        const p2 = await rbac.can('user', 'Post:read:c2Field', 2);
        expect(p2.granted).toBeTruthy();
      });

      it('should distinguish constraints for each granted scope on the action', async function () {
        const p1 = await rbac.can('user', 'Post:read:c1Field', 1);
        expect(p1.constraint).toEqual('c1 constraint');

        const p2 = await rbac.can('user', 'Post:read:c2Field', 2);
        expect(p2.constraint).toEqual('c2 constraint');
      });
    });

    it('should return true for a role which inherits from the role with the permission', async function () {
      const rbac = new RBACPlus();
      rbac.grant('user')
        .resource('Post')
          .action('create')
            .where(({resource, user}) => resource.ownerId === user.id)
        .grant('admin').inherits('user');
      const permission = await rbac.can('admin', 'Post:create', {});
      expect(permission.granted).toBeFalsy();
      expect(permission.denied).toBeTruthy();
      expect(permission.denied).toHaveLength(1);
    });
  });

  describe('with multiple roles', function () {
    let rbac;
    beforeEach(function () {
      rbac = new RBACPlus();
      rbac
        .grant('role1').scope('res1:read')
        .grant('role2').scope('res2:read');
    });
    it('should detect a permission in the first provided role', async function () {
      const permission = await rbac.can(['role1', 'role2'], 'res1:read');
      expect(permission.granted).toBeTruthy();
    });

    it('should detect a permission in the second provided role', async function () {
      const permission = await rbac.can(['role1', 'role2'], 'res2:read');
      expect(permission.granted).toBeTruthy();
    });
  });
});
