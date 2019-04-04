'use strict';
let should = require('should');
let manager = require('../../../../src/tests/models/manager');
let sinon = require('sinon');
let database = require('../../../../src/tests/models/database');
let testGenerator = require('../../../../src/tests/models/testGenerator');
let request = require('request-promise-native');
let uuid = require('uuid');

describe('Scenario generator tests', function () {
    let sandbox;
    let insertStub;
    let deleteStub;
    let getTestStub;
    let getTestsStub;
    let testGeneratorStub;
    let getTestRevisionsStub;
    let saveFileStub;
    let getFileStub;
    let getRequestStub;

    before(() => {
        sandbox = sinon.sandbox.create();
        insertStub = sandbox.stub(database, 'insertTest');
        getTestStub = sandbox.stub(database, 'getTest');
        getTestsStub = sandbox.stub(database, 'getTests');
        getTestRevisionsStub = sandbox.stub(database, 'getAllTestRevisions');
        deleteStub = sandbox.stub(database, 'deleteTest');
        getRequestStub = sandbox.stub(request, 'get');
        getFileStub = sandbox.stub(database, 'getFile');
        saveFileStub = sandbox.stub(database, 'saveFile');
        testGeneratorStub = sandbox.stub(testGenerator, 'createTest');
    });

    beforeEach(() => {
        sandbox.resetHistory();
    });

    after(() => {
        sandbox.restore();
    });
    describe('Create new test', function () {
        it('Should save new test to database and return the test id and revision', function () {
            testGeneratorStub.resolves({
                testjson: 'json'
            });
            insertStub.resolves();

            return manager.upsertTest({
                testInfo: 'info' })
                .then(function (result) {
                    insertStub.calledOnce.should.eql(true);
                    result.should.have.keys('id', 'revision_id');
                    Object.keys(result).length.should.eql(2);
                });
        });
    });
    describe('Create new file for test', function () {
        it('Should save new file to database', async () => {
            testGeneratorStub.resolves({
                testjson: 'json'
            });
            insertStub.resolves();
            getRequestStub.resolves('this is js code from dropbox');
            saveFileStub.resolves();

            let result = await manager.upsertTest({
                testInfo: 'info', file_url: 'path to dropbox'
            });

            insertStub.calledOnce.should.eql(true);
            saveFileStub.calledOnce.should.eql(true);
            should.notEqual(insertStub.getCall(0).args[0].fileId, undefined);
            should(getRequestStub.getCall(0).args[0].url).eql('path to dropbox');
            result.should.have.keys('id', 'revision_id');
            Object.keys(result).length.should.eql(2);
        });
    });
    describe('get afile for test', function () {
        it('Should get new file to database', async () => {
            getFileStub.resolves('File content');

            let result = await manager.getFile('somneId');

            getFileStub.calledOnce.should.eql(true);
            should(getFileStub.getCall(0).args[0]).eql('somneId');
            should(result).eql('File content');
        });
        it('Should  throw 404 not found', async () => {
            getFileStub.resolves(undefined);
            try {
                await manager.getFile('idNotExist');
                throw new Error('never should arrived here');
            } catch (error) {
                should(error.statusCode).eql(404);
                should(error.message).eql('Not found');
            }
        });
    });

    describe('Update existing test', function () {
        it('Should update test, keep the existing test id and generate new revision id', function () {
            testGeneratorStub.resolves({
                testjson: 'json'
            });
            insertStub.resolves();

            let existingTestId = uuid();
            return manager.upsertTest({
                testInfo: 'info' }, existingTestId)
                .then(function (result) {
                    insertStub.calledOnce.should.eql(true);
                    result.should.have.keys('id', 'revision_id');
                    result.id.should.eql(existingTestId);
                    Object.keys(result).length.should.eql(2);
                });
        });
    });

    describe('Delete existing test', function () {
        it('Should delete test', function () {
            deleteStub.resolves();

            let existingTestId = uuid();
            return manager.deleteTest(existingTestId)
                .then(function () {
                    deleteStub.calledOnce.should.eql(true);
                });
        });
    });

    describe('Get single test', function () {
        it('Database returns one row, should return the test', function () {
            getTestStub.resolves({
                artillery_json: { id: '1', name: '1' },
                raw_data: { id: '1', name: '1' }
            });
            return manager.getTest(uuid.v4())
                .then(function (res) {
                    res.should.eql({
                        raw_data: {
                            id: '1',
                            name: '1'
                        },
                        artillery_test: {
                            id: '1',
                            name: '1'
                        }
                    });
                });
        });
    });

    describe('Get multiple tests', function () {
        it('Database returns empty row array, should return empty array', function () {
            getTestsStub.resolves([]);
            return manager.getTests()
                .then(function (res) {
                    res.should.eql([]);
                });
        });

        it('Database returns two rows array, should return two tests', function () {
            let firstId = uuid.v4();
            let secondId = uuid.v4();
            let expectedResult = [{
                artillery_test: {
                    id: 1,
                    name: 1
                },
                raw_data: {
                    id: 1,
                    name: 1
                },
                id: firstId
            },
            {
                artillery_test: {
                    id: 1,
                    name: 1
                },
                raw_data: {
                    id: 1,
                    name: 1
                },
                id: secondId
            }
            ];
            getTestsStub.resolves([{
                id: firstId,
                raw_data: expectedResult[0].raw_data,
                artillery_json: expectedResult[0].artillery_test
            },
            {
                id: firstId,
                raw_data: expectedResult[0].raw_data,
                artillery_json: expectedResult[0].artillery_test
            },
            {
                id: secondId,
                raw_data: expectedResult[1].raw_data,
                artillery_json: expectedResult[1].artillery_test
            }
            ]);
            return manager.getTests()
                .then(function (res) {
                    res.should.containDeep(expectedResult);
                });
        });

        it('Database returns three rows array, two with the same id, should return two tests', function () {
            let firstId = uuid.v4();
            let secondId = uuid.v4();
            let expectedResult = [{
                artillery_test: {
                    id: 1,
                    name: 1
                },
                raw_data: {
                    id: 1,
                    name: 1
                },
                id: firstId
            },
            {
                artillery_test: {
                    id: 1,
                    name: 1
                },
                raw_data: {
                    id: 1,
                    name: 1
                },
                id: secondId
            }
            ];
            getTestsStub.resolves([{
                id: firstId,
                raw_data: expectedResult[0].raw_data,
                artillery_json: expectedResult[0].artillery_test
            },
            {
                id: secondId,
                raw_data: expectedResult[1].raw_data,
                artillery_json: expectedResult[1].artillery_test
            }
            ]);
            return manager.getTests()
                .then(function (res) {
                    res.should.containDeep(expectedResult);
                });
        });
    });

    describe('Get all test revisions', function () {
        it('Database returns empty row array, throw an error with 404', function () {
            getTestRevisionsStub.resolves([]);
            return manager.getAllTestRevisions(uuid.v4())
                .then(function (res) {
                    throw new Error('should not get here');
                }).catch(function (err) {
                    should(err.statusCode).eql(404);
                    should(err.message).eql('Not found');
                });
        });

        it('Database returns one row, should return the test', function () {
            let expectedResult = [{
                artillery_test: {
                    id: 1,
                    name: 1
                },
                raw_data: {
                    id: 1,
                    name: 1
                },
                id: uuid.v4(),
                revision_id: 'revision_id',
                updated_at: Date.now()
            }];
            getTestRevisionsStub.resolves([{
                artillery_json: expectedResult[0].artillery_test,
                raw_data: expectedResult[0].raw_data,
                id: expectedResult[0].id,
                revision_id: expectedResult[0].revision_id,
                updated_at: expectedResult[0].updated_at
            }]);
            return manager.getAllTestRevisions(uuid.v4())
                .then(function (res) {
                    res.should.eql(expectedResult);
                });
        });
    });
});