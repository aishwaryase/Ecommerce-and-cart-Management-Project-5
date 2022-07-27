const userModel = require("../Models/userModel")
const jwt = require("jsonwebtoken")
const valid = require("../validations/validation")
const aws = require("aws-sdk")
const bcrypt = require("bcrypt")


aws.config.update({
    accessKeyId: "AKIAY3L35MCRVFM24Q7U",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile = async (file) => {
    return new Promise(function (resolve, reject) {
        // this function will upload file to aws and return the link
        let s3 = new aws.S3({ apiVersion: '2006-03-01' }); // we will be using the s3 service of aws

        var uploadParams = {
            ACL: "public-read",
            Bucket: "classroom-training-bucket",  //HERE
            Key: "abc/" + file.originalname, //HERE 
            Body: file.buffer
        }

        s3.upload(uploadParams, function (err, data) {
            if (err) {
                return reject({ "error": err })
            }
            // console.log("file uploaded succesfully")
            return resolve(data.Location)
        })
    })
}


const createUsers = async function (req, res) {
    try {

        let data = req.body

        let { fname, lname, email, phone, password, address } = data

        let files = req.files
        if (!files || files.length === 0) return res.status(400).send({
            status: false,
            message: "No cover image found."
        })

        let profileImage = await uploadFile(files[0])

        data.profileImage = profileImage

        //***********check if the body is empty**************//

        if (Object.keys(data).length === 0) {
            return res.status(400).send({
                status: false,
                message: "Body should  be not Empty please enter some data to create user"
            })
        }

        //<-------These validations for Mandatory fields--------->//

        if (!valid.isValid(fname)) {
            return res.status(400).send({ status: false, message: "fname is required" })
        }

        //validate name
        if (!valid.nameValidationRegex(fname)) {
            return res.status(400).send({ status: false, message: `fname contain only alphabets` })

        }
        if (!isNaN(fname)) {
            console.log(fname)
            return res.status(400).send({
                status: false,
                message: "fname can't be a number"
            })
        }

        if (!valid.isValid(lname)) {
            return res.status(400).send({
                status: false,
                msg: "lname field is mandatory"
            });
        }

        //validate name
        if (!valid.nameValidationRegex(lname)) {
            return res.status(400).send({
                status: false,
                message: `lname contain only alphabets`
            })

        }
        if (!isNaN(lname)) {
            return res.status(400).send({
                status: false,
                message: "lname can't be a number"
            })
        }

        if (!valid.isValid(email)) {
            return res.status(400).send({
                status: false,
                msg: "email field is mandatory"
            });
        }

        if (await userModel.findOne({ email: email }))
            return res.status(400).send({
                status: false,
                message: "Email is already exist"
            })

        if (!valid.emailValidationRegex(email)) {
            return res.status(400).send({
                status: false,
                msg: "Enter valid email"
            })
        }

        if (!valid.isValid(profileImage)) {
            return res.status(400).send({
                status: false,
                msg: "profileImage field is mandatory"
            });
        }

        if (!valid.isValid(phone)) {
            return res.status(400).send({
                status: false,
                msg: "phone field is mandatory"
            });
        }

        if (await userModel.findOne({ phone: phone }))
            return res.status(400).send({
                status: false,
                message: "Phone is already exist"
            })

        if (!valid.phoneValidationRegex(phone)) {
            return res.status(400).send({
                status: false,
                msg: "Enter valid Phone No."
            })
        }

        if (!valid.isValid(password)) {
            return res.status(400).send({
                status: false,
                msg: "password field is mandatory"
            });
        }

        if (!valid.isValid(address)) {
            return res.status(400).send({
                status: false,
                msg: "address field is mandatory"
            });
        }
        data.address = JSON.parse(data.address)

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt)
        data.password = hashedPass;

        const userCreated = await userModel.create(data)

        return res.status(201).send({
            status: true,
            message: "User created successfully",
            data: userCreated
        })
    }
    catch (error) {
        return res.status(500).send({
            status: false,
            message: error.message
        })
    }
}


//========================[ User Login ]======================================//

const userLogin = async function (req, res) {
    try {
        let data = req.body
        let { email, password } = data

        if (Object.keys(data).length == 0) {
            return res.status(400).send({
                status: false,
                message: "login credentials must be presents & only email and password should be inside body"
            })
        }

        if (!email) {
            return res.status(400).send({
                status: false,
                message: "email is required"
            })
        }
        if (!valid.emailValidationRegex(email)) {
            return res.status(400).send({
                status: false,
                message: "the email should not be in format"
            })
        }
        if (!password) {
            return res.status(400).send({
                status: false,
                message: "password is required"
            })
        }

        let user = await userModel.findOne({ email: email })
        console.log(user)
        if (!user) {
            return res.status(400).send({
                status: false,
                msg: "please check your email"
            })
        }
        let compared = await bcrypt.compare(password, user.password)
        console.log(compared)

        if (!compared) {
            return res.status(400).send({
                status: false,
                message: "password is incorrect"
            })
        }


        let token = jwt.sign({
            userId: user._id,
            iat: new Date().getTime(),
            exp: Math.floor(Date.now() / 1000) + 10 * 60 * 60
        }, "project-5",

        )

        return res.status(200).send({ status: true, msg: "User login successfull", data: { userId: user._id, token: token } })
    }
    catch (error) {
        return res.status(500).send({
            status: false,
            msg: error.message
        })
    }
}

//========================[ getUserById Api ]======================================//

const getUserById = async function (req, res) {
    try {

        let userId = req.params.userId
        let getUser = await userModel.findOne({ _id: userId })

        return res.status(200).send({
            status: true,
            message: "User profile details",
            data: getUser
        })
    }
    catch (err) {
        return res.status(500).send({
            status: false,
            message: err.message
        })
    }
}

//========================[ Start's User Update Api's ]======================================//

const updateUser = async function (req, res) {
    try {
        let userId = req.params.userId.trim()
        let data = req.body
        let { fname, lname, email, phone, password, profileImage, address } = data

        if (!valid.isValidObjectId(userId)) {
            return res.status(400).send({
                status: false,
                msg: "User Id incorrect"
            })
        }

        if (fname) {
            if (!valid.isValid(fname)) {
                return res.status(400).send({
                    status: false,
                    msg: "fname should be in string format and can't be a any white spaces",
                })
            }
            if (!valid.nameValidationRegex(fname)) {
                return res.status(400).send({
                    status: false,
                    message: `fname contain only alphabets`
                })
            }
        }

        if (lname) {
            if (!valid.isValid(lname)) {
                return res.status(400).send({
                    status: false,
                    msg: "lname should be in string format and can't be a any white spaces",
                })
            }
            if (!valid.nameValidationRegex(lname)) {
                return res.status(400).send({
                    status: false,
                    msg: `lname is not valid`,
                })
            }
        }

        if (email) {
            if (!valid.isValid(email)) {
                return res.status(400).send({
                    status: false,
                    msg: "lname should be in string format",
                })
            }
            if (!valid.emailValidationRegex(email)) {
                return res.status(400).send({
                    status: false,
                    msg: "Enter valid Email"
                })
            }
        }

        if (phone) {
            if (!valid.phoneValidationRegex(phone)) {
                return res.status(400).send({
                    status: false,
                    msg: "phone no. only 10 digit and also should have Indian No."
                })
            }
        }
        if (password) {
            if (!valid.passwordValidationRegex(password)) {
                return res.status(400).send({
                    status: false,
                    message: `password shoud be minimum 8 to maximum 15 characters which contain at least one numeric digit, one uppercase and one lowercase letter`
                })
            }
        }

        if (profileImage) {
            let files = req.files
            if (!files || files.length === 0) return res.status(400).send({
                status: false,
                message: "No cover image found."
            })
            profileImage = await uploadFile(files[0])
            data.profileImage = profileImage
        }

        var parseAddress = JSON.parse(data.address)
        if (parseAddress) {
            try {
                var parseAddress = JSON.parse(data.address) // converting a JSON object in text format to a Javascript object
                // console.log(parseAddress)
            }
            catch (err) {
                return res.status(400).send({ status: false, error: "pincode should not be starts from 0" })
            }
            parseAddress = JSON.parse(data.address)
            console.log(parseAddress)
            if (parseAddress.shipping) {
                // console.log(parseAddress.shipping)

                if (!valid.isValid(parseAddress.shipping.street)) {
                    return res.status(400).send({
                        status: false,
                        message: "shipping street address should be in string format"
                    })
                }
                if (!valid.isValid(parseAddress.shipping.city)) {
                    return res.status(400).send({
                        status: false,
                        message: "city street address should be in string format"
                    })
                }
                if (!valid.regPincode(parseAddress.shipping.pincode)) {
                    return res.status(400).send({
                        status: false,
                        message: "pincode "
                    })
                }
            }

            if (parseAddress.billing) {
                if (!valid.isValid(parseAddress.billing.street)) {
                    return res.status(400).send({
                        status: false,
                        message: "billing street address should be in string format"
                    })
                }
                if (!valid.isValid(parseAddress.billing.city)) {
                    return res.status(400).send({
                        status: false,
                        message: "city street address should be in string format"
                    })
                }
                if (!valid.regPincode(parseAddress.billing.pincode)) {
                    return res.status(400).send({
                        status: false,
                        message: "pincode street address should be in string format"
                    })
                }
            }
        }

        let userUpdate = await userModel.findOneAndUpdate({ _id: userId }, { $set: data }, { new: true })
        return res.status(200).send({
            status: true,
            data: userUpdate
        })
    } catch (Err) {
        return res.status(500).send({
            status: false,
            msg: Err.message
        })
    }

}


module.exports = { userLogin, createUsers, getUserById, updateUser }