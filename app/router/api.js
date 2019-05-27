'use strict';

module.exports = app => {
    const apiV1Router = app.router.namespace('/api/v1/');
    const { controller, io } = app;
    const {
        files,
        team,
        application,
        assets,
        util,
        environment,
        email,
        build,
        commtask,
        logs,
        user,
    } = controller.api;

    // 校验用户是否登录中间件
    // const tokenRequired = middleware.tokenRequired();
    // -----------------用户相关------------------
    // 用户登录
    apiV1Router.post('user/login', user.login);
    // 用户注册
    apiV1Router.post('user/register', user.register);
    // 退出登录
    apiV1Router.get('user/logout', user.logout);
    // 新增 | 编辑
    apiV1Router.post('user/handle', user.handle);
    // 获得用户列表
    apiV1Router.get('user/getUserList', user.getUserList);
    // 冻结解冻用户
    apiV1Router.post('user/setStatus', user.setStatus);
    // 删除用户
    apiV1Router.post('user/delete', user.delete);

    // --------------------------- 团队管理 --------------------------------
    // get list
    apiV1Router.get('team/list', team.list);
    // 新增 | 编辑
    apiV1Router.post('team/handle', team.handle);
    // 设置状态
    apiV1Router.post('team/setStatus', team.setStatus);
    // 删除
    apiV1Router.post('team/delete', team.delete);

    // --------------------------- 环境管理 --------------------------------
    // get list
    apiV1Router.get('environment/list', environment.list);
    // 新增 | 编辑
    apiV1Router.post('environment/handle', environment.handle);
    // 删除
    apiV1Router.post('environment/delete', environment.delete);

    // --------------------------- 应用管理 --------------------------------
    // get list
    apiV1Router.get('application/list', application.list);
    // get all
    apiV1Router.get('application/all', application.all);
    // 新增 | 编辑
    apiV1Router.post('application/handle', application.handle);
    // 设置状态
    apiV1Router.post('application/setStatus', application.setStatus);
    // 删除
    apiV1Router.post('application/delete', application.delete);
    // 分配资产
    apiV1Router.post('application/distribution', application.distribution);
    // 获得单个应用详情
    apiV1Router.get('application/itemdetail', application.itemdetail);
    // 更新单个应用构建配置
    apiV1Router.post('application/updateConfigs', application.updateConfigs);
    // 绑定|取消 应用绑定的邮箱
    apiV1Router.post('application/handleEmail', application.handleEmail);

    // --------------------------- 资产管理 --------------------------------
    // get list
    apiV1Router.get('assets/list', assets.list);
    // get all
    apiV1Router.get('assets/all', assets.all);
    // 新增 | 编辑
    apiV1Router.post('assets/handle', assets.handle);
    // 设置状态
    apiV1Router.post('assets/setStatus', assets.setStatus);
    // 删除
    apiV1Router.post('assets/delete', assets.delete);

    // --------------------------- 邮件管理 --------------------------------
    // get list
    apiV1Router.get('email/list', email.list);
    // 新增 | 编辑
    apiV1Router.post('email/handle', email.handle);
    // 设置状态
    apiV1Router.post('email/setStatus', email.setStatus);
    // 删除
    apiV1Router.post('email/delete', email.delete);

    // -------------------------- 脚本任务管理 ------------------------------
    // get list
    apiV1Router.get('commtask/list', commtask.list);
    // 新增 | 编辑
    apiV1Router.post('commtask/handle', commtask.handle);
    // 删除
    apiV1Router.post('commtask/delete', commtask.delete);

    // --------------------------shh sftp 交互------------------------------
    // update files
    apiV1Router.post('files/updatefile', files.updatefile);
    // add files
    apiV1Router.post('files/addfile', files.addfile);

    // --------------------------工具方法------------------------------
    // 获得ssh key
    apiV1Router.post('util/getAssetSshKey', util.getAssetSshKey);
    // 执行shell任务
    apiV1Router.post('util/handleShellTasks', util.handleShellTasks);

    // -------------------------- build 构建 ------------------------------
    // 生成构建配置
    apiV1Router.post('build/generateBuildConfig', build.generateBuildConfig);
    // 备份服务
    apiV1Router.post('build/backupApplications', build.backupApplications);
    // 构建应用
    apiV1Router.post('build/buildApplicationed', build.buildApplicationed);
    // 应用还原
    apiV1Router.post('build/reductionApplications', build.reductionApplications);

    // -------------------------- logs 构建 ------------------------------
    apiV1Router.get('logs/list', logs.list);

    // -------------------------- socket.io ------------------------------
    // socket.io
    io.of('/').route('socket', io.controller.nsp.socket);
};
