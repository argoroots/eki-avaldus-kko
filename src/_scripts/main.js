$(function () {
    $('#submit').click(function () {
        $('#form').addClass('d-none')
        $('#uploading').removeClass('d-none')

        plausible('Submit')

        var properties = [
            { type: '_type', reference: 'schoolbook-application' },
            { type: 'title', string: $('#title').val() },
            { type: 'lead_name', string: $('#author-name').val() },
            { type: 'lead_email', string: $('#author-email').val() },
            { type: 'result', string: $('#urls').val() }
        ]


        var files = []
        var fileElements = $('#file input[type="file"]')

        for (let i = 0; i < fileElements.length; i++) {
            for (let n = 0; n < fileElements[i].files.length; n++) {
                files.push(fileElements[i].files[n])
            }
        }

        getToken(function(token) {
            if(!token) {
                console.error('No token')
                return
            }

            window.entuApiToken = token

            createEntity(properties, function(newEntityId) {
                var filesUploaded = 0
                var filesToUpload = files.length

                console.log('Created entity #' + newEntityId)
                console.log(filesToUpload + ' file(s) to upload')

                if (filesToUpload > 0) {
                    for (let i = 0; i < filesToUpload; i++) {
                        createFileProperty(newEntityId, files[i], function(result) {
                            filesUploaded++
                            console.log('Created file property #', result)

                            if (filesToUpload === filesUploaded) {
                                updateRights(newEntityId, function (r) {
                                    console.log('Updated rights')

                                    $('#uploading').addClass('d-none')
                                    $('#done').removeClass('d-none')
                                })
                            }
                        })
                    }
                } else {
                    updateRights(newEntityId, function (r) {
                        console.log('Updated rights')

                        $('#uploading').addClass('d-none')
                        $('#done').removeClass('d-none')
                    })
                }
            })
        })
    })

    function getToken(callback) {
        $.ajax({
            method: 'GET',
            url: 'https://entu.app/api/auth?account=eki',
            cache: false,
            headers: { 'Authorization': 'Bearer ' + window.entuApiKey },
            success: function(data) {
                callback(data.token)
            }
        })
    }

    function createEntity(properties, callback) {
        $.ajax({
            method: 'POST',
            url: 'https://entu.app/api/eki/entity',
            cache: false,
            headers: { 'Authorization': 'Bearer ' + window.entuApiToken },
            data: JSON.stringify(properties),
            contentType: 'application/json',
            dataType: 'json',
            success: function(data) {
                callback(data._id)
            }
        })
    }

    function createFileProperty(entityId, file, callback) {
        var properties = [{
            type: 'file',
            filename: file.name,
            filesize: file.size,
            filetype: file.type
        }]

        plausible('Upload')

        $.ajax({
            method: 'POST',
            url: 'https://entu.app/api/eki/entity/' + entityId,
            cache: false,
            headers: { 'Authorization': 'Bearer ' + window.entuApiToken },
            data: JSON.stringify(properties),
            contentType: 'application/json',
            dataType: 'json',
            success: function(data) {
                uploadFile(file, data.properties[0].upload, function() {
                    callback(data.properties[0]._id)
                })
            }
        })
    }

    function uploadFile(file, s3data, callback) {
        var xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', function(event) {
            if(event.lengthComputable) {
                console.log(file.name + ' - ' + Math.round(event.loaded * 1000 / event.total) / 10 + '%')
            }
        }, false)

        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.status == 200) {
                callback($('Key', xhr.responseXML).text())
            }

            if(xhr.readyState == 4 && xhr.status != 200) {
                console.error(file.name + ' - UPLOAD ERROR!')
            }
        }

        xhr.open(s3data.method, s3data.url, true)

        for (var headerName in s3data.headers) {
            xhr.setRequestHeader(headerName, s3data.headers[headerName])
        }

        xhr.send(file)
    }

    function updateRights(entityId, callback) {
        // var data = {
        //     entity: window.entuApiUser
        // }

        // $.ajax({
        //     method: 'POST',
        //     url: 'https://entu.app/api/eki/entity/' + entityId,
        //     cache: false,
        //     headers: { 'Authorization': 'Bearer ' + window.entuApiToken },
        //     data: JSON.stringify(data),
        //     contentType: 'application/json',
        //     dataType: 'json',
        //     success: function() {
        //         callback()
        //     }
        // })

        callback()
    }
})
