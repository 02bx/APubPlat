// 七牛JDK
'use strict';

const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');

class BuildService extends Service {

    // 生成构建配置
    async generateBuildConfig(id, taskItem = {}, assetslist = [], user_name) {
        let file = '';
        let paths = '/';
        if (taskItem.shell_path && taskItem.shell_path.indexOf('/') > -1) {
            file = path.basename(taskItem.shell_path);
            paths = path.dirname(taskItem.shell_path);
        } else {
            throw new Error('shell脚本地址必须以/开头!');
        }

        taskItem.shell_write_type = taskItem.shell_write_type ? parseInt(taskItem.shell_write_type) : 1;
        taskItem.shell_body = taskItem.shell_body.replace(/\r\n/g, '\n');

        // 本地创建文件
        if (taskItem.shell_write_type === 1) fs.writeFileSync(path.resolve(__dirname, '../tempFile/' + file), taskItem.shell_body);

        // 发布到相应服务器
        const result = [];
        for (let i = 0; i < assetslist.length; i++) { result.push(this.genConfigsForSsh(paths, file, assetslist[i], taskItem)); }
        const data = await Promise.all(result);
        // add logs
        const json = {
            application_id: id,
            task_name: `${taskItem.task_name}任务-生成构建配置`,
            type: 3,
            isLoad: true,
            user_name,
            content: data || [],
        };
        this.ctx.service.logs.addLogs(json);
        // 删除本地文件
        if (taskItem.shell_write_type === 1) fs.unlinkSync(path.resolve(__dirname, '../tempFile/' + file));
        return json;
    }

    // 脚本备份
    async backupApplications(id, taskItem = {}, assetslist = [], user_name) {
        const bakList = [];
        const { project_path, backups_path } = taskItem;
        const backupDir = 'bak_' + this.app.format(new Date(), 'yyyy-MM-dd:hh:mm:ss');
        const projectName = project_path ? project_path.split('/').splice(-1).join() : '';
        const backupPath = `${backups_path}/${backupDir}/${projectName}`;

        for (let i = 0; i < assetslist.length; i++) {
            bakList.push(Promise.resolve(this.backUpProject(taskItem, assetslist[i], backupPath, backupDir)));
        }
        const result = await Promise.all(bakList);
        const json = {
            application_id: id,
            task_name: `${taskItem.task_name}任务-服务备份`,
            type: 2,
            isLoad: true,
            user_name,
            content: result || [],
        };
        this.ctx.service.logs.addLogs(json);
        return json;
    }

    // 备份还原
    async reductionApplications(id, taskItem = {}, assetslist = [], user_name) {
        let file = '';
        let paths = '/';
        if (taskItem.reduction_shell_path && taskItem.reduction_shell_path.indexOf('/') > -1) {
            file = path.basename(taskItem.reduction_shell_path);
            paths = path.dirname(taskItem.reduction_shell_path);
        } else {
            throw new Error('shell脚本地址必须以/开头!');
        }

        taskItem.reduction_shell_write_type = taskItem.reduction_shell_write_type ? parseInt(taskItem.reduction_shell_write_type) : 1;
        taskItem.reduction_shell_body = taskItem.reduction_shell_body.replace(/\r\n/g, '\n');

        // 本地创建文件
        if (taskItem.reduction_shell_write_type === 1) fs.writeFileSync(path.resolve(__dirname, '../tempFile/' + file), taskItem.reduction_shell_body);

        // 发布到相应服务器
        const result = [];
        for (let i = 0; i < assetslist.length; i++) { result.push(this.reductionProject(paths, file, assetslist[i], taskItem)); }
        const data = await Promise.all(result);
        // add logs
        const json = {
            application_id: id,
            task_name: `${taskItem.name}任务-备份还原`,
            type: 5,
            user_name,
            isLoad: true,
            content: data || [],
        };
        this.ctx.service.logs.addLogs(json);
        // 删除本地文件
        if (taskItem.reduction_shell_write_type === 1) fs.unlinkSync(path.resolve(__dirname, '../tempFile/' + file));
        return json;
    }

    // 应用还原
    reductionProject(paths, file, asstesItem, taskItem) {
        return new Promise((resolve, reject) => {
            const Client = require('ssh2-sftp-client');
            const sftp = new Client();
            sftp.connect({
                host: asstesItem.outer_ip,
                port: asstesItem.port,
                username: asstesItem.user,
                password: asstesItem.password,
            })
                .then(() => {
                    return sftp.exists(paths);
                })
                .then(data => {
                    if (!data) return sftp.mkdir(paths, true);
                    return 1;
                })
                .then(() => {
                    if (taskItem.reduction_shell_write_type === 1) {
                        return sftp.fastPut(path.resolve(__dirname, '../tempFile/' + file), taskItem.reduction_shell_path);
                    } else if (taskItem.reduction_shell_write_type === 2) {
                        taskItem.reduction_shell_body = taskItem.reduction_shell_body.replace(/'/g, '"');
                        return this.exec(sftp, "echo '" + taskItem.reduction_shell_body + "' > " + taskItem.reduction_shell_path);
                    }
                })
                .then(data => {
                    if (typeof (data) === 'string') {
                        data = {
                            data,
                            code: 0,
                        };
                    }
                    if (data.code === 0) {
                        const shell = taskItem.reduction_shell_opction ?
                            `sh ${taskItem.reduction_shell_path} ${taskItem.reduction_shell_opction}` :
                            `sh ${taskItem.reduction_shell_path}`;
                        return this.exec(sftp, shell);
                    } else if (data.code !== 0) {
                        return data;
                    }
                })
                .then(data => {
                    if (typeof (data) === 'string') {
                        data = {
                            data,
                            code: 0,
                        };
                    }
                    resolve(Object.assign({}, data, {
                        assets_name: asstesItem.assets_name || '',
                        lan_ip: asstesItem.lan_ip || '',
                        outer_ip: asstesItem.outer_ip || '',
                    }));
                    sftp.end();
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    // 文件备份
    async backUpProject(taskItem, assets, backupPath, backupDir) {
        const { outer_ip, port, user, password } = assets;
        const { project_path, backups_path } = taskItem;
        return new Promise((resolve, reject) => {
            const Client = require('ssh2-sftp-client');
            const sftp = new Client();
            sftp.connect({
                host: outer_ip,
                username: user,
                port,
                password,
            })
                .then(() => {
                    const sh = `mkdir -p ${backups_path}/${backupDir} && cp -r ${project_path} ${backupPath}`;
                    return this.exec(sftp, sh) || {};
                }).then(data => {
                    resolve(Object.assign({}, data, {
                        assets_name: assets.name || '',
                        lan_ip: assets.lan_ip || '',
                        outer_ip: assets.outer_ip || '',
                        backup_path: backupPath,
                        project_path,
                    }));
                    sftp.end();
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    // 上传文件
    async genConfigsForSsh(paths, file, asstesItem, taskItem) {
        return new Promise((resolve, reject) => {
            const Client = require('ssh2-sftp-client');
            const sftp = new Client();
            sftp.connect({
                host: asstesItem.outer_ip,
                port: asstesItem.port,
                username: asstesItem.user,
                password: asstesItem.password,
            })
                .then(() => {
                    return sftp.exists(paths);
                })
                .then(data => {
                    if (!data) return sftp.mkdir(paths, true);
                    return 1;
                })
                .then(() => {
                    if (taskItem.shell_write_type === 1) {
                        return sftp.fastPut(path.resolve(__dirname, '../tempFile/' + file), taskItem.shell_path);
                    } else if (taskItem.shell_write_type === 2) {
                        taskItem.shell_body = taskItem.shell_body.replace(/'/g, '"');
                        return this.exec(sftp, "echo '" + taskItem.shell_body + "' > " + taskItem.shell_path);
                    }
                })
                .then(data => {
                    if (typeof (data) === 'string') {
                        data = {
                            data,
                            code: 0,
                        };
                    }
                    resolve(Object.assign({}, data, {
                        assets_name: asstesItem.name || '',
                        lan_ip: asstesItem.lan_ip || '',
                        outer_ip: asstesItem.outer_ip || '',
                    }));
                    sftp.end();
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    // 执行shell任务
    exec(sftp, shell) {
        return new Promise((resolve, reject) => {
            let str = '';
            sftp.client.exec(shell, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }
                stream.on('close', code => {
                    return resolve({
                        data: str,
                        shell,
                        code,
                    });
                }).on('data', data => {
                    str += data;
                }).stderr.on('data', data => {
                    str += data;
                });
            });
            return undefined;
        });
    }
}

module.exports = BuildService;
