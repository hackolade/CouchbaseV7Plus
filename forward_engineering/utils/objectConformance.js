/*
 * Copyright © 2016-2024 by IntegrIT S.A. dba Hackolade.  All rights reserved.
 *
 * The copyright to the computer software herein is the property of IntegrIT S.A.
 * The software may be used and/or copied only with the written permission of
 * IntegrIT S.A. or in accordance with the terms and conditions stipulated in
 * the agreement/contract under which the software has been supplied.
 */
const VALID_NAME_REGEX = /[^A-Za-z0-9_.\-%]/g;
const MAX_NAME_LENGTH = 100;

const getValidBucketName = ({ name, code }) => {
	const bucketName = code || name || '';

	return bucketName.replace(VALID_NAME_REGEX, '_').slice(0, MAX_NAME_LENGTH);
};

module.exports = { getValidBucketName };
