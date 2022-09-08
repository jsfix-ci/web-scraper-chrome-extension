import axios from 'axios';
import urlJoin from 'url-join';
import StoreRestApi from './StoreRestApi';
import 'sugar';

export default class StoreTalismanApi extends StoreRestApi {
	constructor(config, baseUrl) {
		const sitemapsPath = urlJoin('api', 'sitemaps/');
		super(config, baseUrl, sitemapsPath);
	}

	async initTalismanLogin(credentials) {
		let bodyForm = new FormData();
		let tLogin = credentials.username;
		let tPassword = credentials.password;
		bodyForm.append('username', tLogin);
		bodyForm.append('password', tPassword);
		const loginStatus = await this.axiosInstance
			.post(urlJoin(this.axiosInstance.defaults.baseURL, '/oauth/login'), bodyForm, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			})
			.catch(er => er);
		if (loginStatus.isAxiosError || loginStatus.data.access_token === undefined) {
			return {
				authStatus: {
					success: false,
					status: loginStatus.status,
					message: loginStatus.message,
				},
			};
		} else {
			let credential = { username: credentials.username };
			this.postInit();
			let tToken = loginStatus.data.access_token;
			this.axiosInstance.defaults.headers['Authorization'] = 'Bearer ' + tToken;
			return {
				authStatus: {
					success: true,
					username: credentials.username,
					credential: credential,
				},
			};
		}
	}

	async isAuthorized() {
		let tUrl = this.axiosInstance.defaults.baseURL;
		try {
			tUrl = new URL(tUrl).origin;
		} catch (err) {
			$('.alert').attr('id', 'error').text(err).show();
			return false;
		}
		let response = await axios({
			method: 'get',
			url: `${tUrl}/oauth/token`,
		});
		try {
			if (response.data.preferred_username) {
				return response.data;
			} else {
				return false;
			}
		} catch (er) {
			$('.alert').attr('id', 'error').text(er).show();
			return false;
		}
	}

	async logOut() {
		delete this.axiosInstance.defaults.headers.Authorization;
		await this.axiosInstance.get('/oauth/logout');
	}

	async listAllConceptTypes() {
		return this.axiosInstance
			.post('/graphql', {
				operationName: 'listConceptTypes',
				query: 'query listConceptTypes { listConceptType { id name } }',
			})
			.then(response => response.data.data.listConceptType);
	}

	async getSingleConceptType(id) {
		return this.axiosInstance
			.post('/graphql', {
				operationName: 'getConceptType',
				query: `query getConceptType($id: ID!) {
					conceptType(id: $id) {
						id
						name
						listConceptPropertyType {
							id
							name
						}
						listConceptLinkType {
							id
							name
						}
					}
				}`,
				variables: { id },
			})
			.then(response => response.data.data.conceptType);
	}

	async getConceptTypes(ids) {
		return (
			await Promise.all(
				ids.unique().map(id => {
					return this.getSingleConceptType(id).catch(console.error);
				})
			)
		).compact();
	}

	async getSingleLinkType(id) {
		return this.axiosInstance
			.post('/graphql', {
				operationName: 'getLinkType',
				query: `query getLinkType($id: ID!) {
					conceptLinkType(id: $id) {
						id
						name
						isDirected
						conceptFromType {
							id
							name
						}
						conceptToType {
							id
							name
						}
						listConceptLinkPropertyType {
							id
							name
						}
					}
				}`,
				variables: { id },
			})
			.then(response => response.data.data.conceptLinkType);
	}

	async getLinkTypes(ids) {
		return (
			await Promise.all(
				ids.unique().map(id => {
					return this.getSingleLinkType(id).catch(console.error);
				})
			)
		).compact();
	}
}
