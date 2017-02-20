/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

/*
 * zfs.js: Endpoints to manage ZFS datasets and pools
 */

var common = require('../common');
var restify = require('restify');
var util = require('util');
var ModelServer = require('../models/server');

function ZFS() {}


/**
 * List ZFS datasets on a server.
 *
 * @name DatasetsList
 * @endpoint GET GET /servers/:server_uuid/datasets
 * @section ZFS API
 *
 * @example GET /servers/44454c4c-4800-1034-804a-b2c04f354d31/datasets
 *
 * @response 200 Array Array of objects, one per dataset on server
 */

ZFS.listDatasets = function handlerZfsListDatasets(req, res, next) {
    var server = req.stash.server;
    var opts = {
        params: req.params,
        req: req
    };

    server.zfsTask('zfs_list_datasets', opts, function (err, results) {
        if (err) {
            return (next(new restify.InternalError(
                'cannot list datasets:' + err.message)));
        }

        res.send(results);
        return (next());
    });
};


/**
 * Create a ZFS dataset on a server.
 *
 * @name DatasetCreate
 * @endpoint POST /servers/:server_uuid/datasets
 * @section ZFS API
 *
 * @example POST /servers/44454c4c-4800-1034-804a-b2c04f354d31/datasets
 *         -d "datasets=zones/myfs"
 *
 * @response 204 None Dataset successfully created
 */

ZFS.createDataset = function handlerZfsCreateDataset(req, res, next) {
    var server = req.stash.server;
    var opts = {
        params: req.params,
        req: req
    };

    server.zfsTask('zfs_create_dataset', opts, function (err) {
        if (err) {
            return (next(new restify.InternalError(
                'cannot create dataset:' + err.message)));
        }

        res.send(204);
        return (next());
    });
};


/**
 * Create a ZFS snapshot of a dataset on a server.
 *
 * @name SnapshotCreate
 * @endpoint POST /servers/:server_uuid/datasets/:dataset/snapshot
 * @section ZFS API
 *
 * @param {String} name The name of the snapshot to create
 *
 * @example POST /servers/44454c4c-4800-1034-804a-b2c04f354d31\
 *          /datasets/zones%2Fmyfs/snapshot -d '{ "name": "backup" }'
 *
 * @response 204 None Snapshot successfully created
 */

ZFS.createSnapshot = function handlerZfsCreateSnapshot(req, res, next) {
    var server = req.stash.server;
    var name = req.params.name;
    var snapshot = req.params.dataset + '@' + name;

    var opts = {
        params: { dataset: snapshot },
        req: req
    };

    server.zfsTask(
        'zfs_snapshot_dataset',
        opts,
        function (err) {
            if (err) {
                next(new restify.InternalError(
                    'cannot create snapshot: ' + err.message));
                return;
            }
            res.send(204);
            next();
            return;
        });
};

/**
 * Revert a ZFS dataset to back to a previous state captured by a snapshot.
 *
 * @name SnapshotRollback
 * @endpoint POST /servers/:server_uuid/datasets/:dataset/rollback
 * @section ZFS API
 *
 * @param {String} name The name of the snapshot to be created
 *
 * @example POST /servers/44454c4c-4800-1034-804a-b2c04f354d31
 *          /datasets/zones%2Fmyfs/rollback -d '{ "name": "backup" }'
 *
 * @response 204 None Snapshot successfully rolled back
 */

ZFS.rollbackSnapshot = function handlerZfsRollbackSnapshot(req, res, next) {
    var server = req.stash.server;

    var name = req.params.name;
    var snapshot = req.params.dataset + '@' + name;

    var opts = {
        params: { dataset: snapshot },
        req: req
    };

    server.zfsTask(
        'zfs_rollback_dataset',
        opts,
        function (err) {
            if (err) {
                next(new restify.InternalError(
                    'cannot create snapshot: ' + err.message));
                return;
            }
            res.send(204);
            next();
            return;
        });
};


/**
 * List all snapshots on a dataset
 *
 * @name SnapshotList
 * @endpoint GET /servers/:server_uuid/datasets/:dataset/snapshots
 * @section ZFS API
 *
 * @example GET /servers/44454c4c-4800-1034-804a-b2c04f354d31/datasets
 *
 * @response 200 Array Array of snapshot objects
 */

ZFS.listSnapshots = function handlerZfsListSnapshots(req, res, next) {
    var server = req.stash.server;

    var opts = {
        params: req.params,
        req: req
    };

    server.zfsTask('zfs_list_snapshots', opts, function (err, results) {
        if (err) {
            return (next(new restify.InternalError(
                'cannot list snapshots:' + err.message)));
        }

        res.send(results);
        return (next());
    });
};


function findProps(params) {
    var properties = [];

    for (var key in params) {
        if (params.hasOwnProperty(key) &&
            key.substr(0, 4) === 'prop') {
            properties.push(params[key]);
        }
    }

    return (properties);
}


/**
 * Get ZFS properties across all datasets on a server.
 *
 * @name DatasetPropertiesGetAll
 * @endpoint GET /servers/:server_uuid/dataset-properties
 * @section ZFS API
 *
 * @param {String} <prop1> Get the property given by the "prop1" value
 * @param {String} <prop2> Get the property given by the "prop2" value
 * @param {String} <propN> Get the property given by the "propN" value
 *
 * @example GET /servers/44454c4c-4800-1034-804a-b2c04f354d31\
 *          /dataset-properties?prop1=mountpoint
 * @response 200 Object list of property details
 */

ZFS.getAllProperties = function handlerZfsGetAllProperties(req, res, next) {
    var server = req.stash.server;

    var params = {};
    var properties = findProps(req.params);
    if (properties.length > 0)
        params.properties = properties;

    var opts = {
        params: params,
        req: req
    };

    server.zfsTask('zfs_get_properties', opts, function (err, results) {
        if (err) {
            return (next(new restify.InternalError(
                'cannot get properties:' + err.message)));
        }

        // XXX I need to talk to Orlando about this
        delete results.log;

        res.send(results);
        return (next());
    });
};


/**
 * Get ZFS properties for a dataset.  The specific properties to return can be
 * filtered with ?prop1=foo&prop2=bar, etc.
 *
 * @name DatasetPropertiesGet
 * @endpoint GET /servers/:server_uuid/datasets/:dataset/properties
 * @section ZFS API
 *
 * @param {String} <prop1> Get the property given by the "prop1" value
 * @param {String} <prop2> Get the property given by the "prop2" value
 * @param {String} <propN> Get the property given by the "propN" value
 *
 * @example GET /servers/44454c4c-4800-1034-804a-b2c04f354d31
 *          /datasets/zones%2fmyfs/properties
 * @example GET /servers/44454c4c-4800-1034-804a-b2c04f354d31
 *          /datasets/zones%2fmyfs/properties
 *           -d '{ "prop1": "quota", "prop2": "available" }'
 *
 * @response 200 Array List of dataset property details
 */

ZFS.getProperties = function handlerZfsGetProperties(req, res, next) {
    var server = req.stash.server;
    var dataset = req.params.dataset;

    var params = {};
    params.dataset = dataset;
    var properties = findProps(req.params);
    if (properties.length > 0)
        params.properties = properties;

    var opts = {
        params: params,
        req: req
    };

    server.zfsTask('zfs_get_properties', opts, function (err, results) {
        if (err) {
            return (next(new restify.InternalError(
                'cannot get properties:' + err.message)));
        }

        // XXX I need to talk to Orlando about this
        delete results.log;

        res.send(results);
        return (next());
    });
};


/**
 * Set one or more properties for a ZFS dataset.
 *
 * @name DatasetPropertiesSet
 * @endpoint POST /servers/:server_uuid/datasets/:dataset/properties
 * @section ZFS API
 *
 * @param {Object} properties Object containing string property values
 *
 * @example POST /servers/44454c4c-4800-1034-804a-b2c04f354d31
 *          /datasets/zones\/myfs/properties -d \
 *         '{
 *              "properties": {
 *                  "quota": "5G"
 *              }
 *         }'
 *
 * @response 204 None Properties were set successfully
 */

ZFS.setProperties = function handlerZfsSetProperties(req, res, next) {
    var server = req.stash.server;

    var opts = {
        params: req.params,
        req: req
    };

    server.zfsTask('zfs_set_properties', opts, function (err) {
        if (err) {
            return (next(new restify.InternalError(
                'cannot set properties:' + err.message)));
        }

        res.send(204);
        return (next());
    });
};


/**
 * Destroy a ZFS dataset on a server.
 *
 * @name DatasetDestroy
 * @endpoint DELETE /servers/:server_uuid/datasets/:dataset
 * @section ZFS API
 *
 * @example DELETE /servers/44454c4c-4800-1034-804a-b2c04f354d31
 *          /datasets/zones%2fmyfs
 *
 * @response 204 None Dataset successfully deleted
 */

ZFS.destroyDataset = function handlerZfsDestroyDataset(req, res, next) {
    var server = req.stash.server;

    var opts = {
        params: req.params,
        req: req
    };


    server.zfsTask('zfs_destroy_dataset', opts, function (err) {
        if (err) {
            return (next(new restify.InternalError(
                'cannot destroy dataset:' + err.message)));
        }

        res.send(204);
        return (next());
    });
};


/**
 * List the ZFS pools on a server.
 *
 * @name ZpoolList
 * @endpoint GET /servers/:server_uuid/zpools
 * @section ZFS API
 *
 * @example GET /servers/44454c4c-4800-1034-804a-b2c04f354d31/zpools
 *
 * @response 200 Array List of zpool detail objects
 */

ZFS.listZpools = function handlerZfsListZpools(req, res, next) {
    var server = req.stash.server;

    var opts = {
        params: req.params,
        req: req
    };

    server.zfsTask('zfs_list_pools', opts, function (err, results) {
        if (err) {
            return (next(new restify.InternalError(
                'cannot list pools:' + err.message)));
        }
        res.send(results);
        return (next());
    });
};

function attachTo(http, app) {
    var ensure = require('../endpoints').ensure;

    // List ZFS datasets on a server
    http.get(
        { path: '/servers/:server_uuid/datasets', name: 'DatasetList' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.listDatasets);

    // Create ZFS dataset
    http.post(
        { path: '/servers/:server_uuid/datasets', name: 'DatasetCreate' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.createDataset);

    // Create a snapshot
    http.post(
        { path: '/servers/:server_uuid/datasets/:dataset/snapshot',
          name: 'SnapshotCreate' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.createSnapshot);

    // Rollback a snapshot
    http.post(
        { path: '/servers/:server_uuid/datasets/:dataset/rollback',
          name: 'SnapshotRollback' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.rollbackSnapshot);

    // List snapshots
    http.get(
        { path: '/servers/:server_uuid/datasets/:dataset/snapshots',
          name: 'SnapshotList' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.listSnapshots);

    // Get ZFS properties for all dataset
    http.get(
        { path: '/servers/:server_uuid/dataset-properties',
          name: 'DatasetPropertiesGetAll' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.getAllProperties);

    // Get ZFS properties for a dataset
    http.get(
        { path: '/servers/:server_uuid/datasets/:dataset/properties',
          name: 'DatasePropertiesGet' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.getProperties);

    // Set ZFS properties for a dataset
    http.post(
        { path: '/servers/:server_uuid/datasets/:dataset/properties',
          name: 'DatasetPropertiesSet' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.setProperties);

    // Destroy ZFS dataset
    http.del(
        { path: '/servers/:server_uuid/datasets/:dataset',
          name: 'DatasetDestroy' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.destroyDataset);

    // List ZFS pools on a server
    http.get(
        { path: '/servers/:server_uuid/zpools', name: 'ZpoolList' },
        ensure({
            connectionTimeoutSeconds: 60 * 60,
            app: app,
            prepopulate: ['server'],
            connected: ['moray']
        }),
        ZFS.listZpools);
}

exports.attachTo = attachTo;
